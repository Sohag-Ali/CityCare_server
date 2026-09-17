import httpStatus from "http-status";
import {
	AuditAction,
	AuditEntity,
	PaymentState,
	PaymentStatus,
	Prisma,
	Role,
} from "../../../generated/prisma/client";
import {
	createBkashPayment,
	executeBkashPayment,
	queryBkashPayment,
} from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { AuditLogService } from "../auditLog/auditLog.service";
import type {
	IInitiatePaymentPayload,
	IPaginationOptions,
	IPaymentFilterOptions,
} from "./payment.interface";

const initiatePayment = async (
	authUserId: string,
	payload: IInitiatePaymentPayload,
) => {
	// 1. Authenticate Citizen profile
	const citizen = await prisma.citizen.findFirst({
		where: {
			userId: authUserId,
			isDeleted: false,
		},
	});

	if (!citizen) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Citizen profile not found. Only registered citizens can initiate payments.",
		);
	}

	// 2. Load service request
	const request = await prisma.serviceRequest.findFirst({
		where: {
			id: payload.serviceRequestId,
			isDeleted: false,
		},
		include: {
			service: true,
		},
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	// 3. Verify request belongs to current citizen
	if (request.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You do not have permission to pay for another citizen's request.",
		);
	}

	// 4. Verify request is paid (FREE vs PAID rule)
	const isPaid = request.isPaid || request.service?.isPaid;
	if (!isPaid) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Payment rejected: This service request is for a free municipal service.",
		);
	}

	// 5. Determine correct payable amount strictly from DB (Snapshot or Service baseFee)
	let amountToCharge: Prisma.Decimal | null = request.amount;
	if (!amountToCharge && request.service?.baseFee) {
		amountToCharge = request.service.baseFee;
	}

	if (!amountToCharge || amountToCharge.toNumber() <= 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid or missing payable amount for this service request in database.",
		);
	}

	// 6. Reject if service request is already paid
	if (request.paymentStatus === PaymentStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This service request has already been paid successfully.",
		);
	}

	// Check if a successful payment record already exists
	const existingPaidPayment = await prisma.payment.findFirst({
		where: {
			serviceRequestId: request.id,
			status: PaymentState.SUCCESS,
		},
	});

	if (existingPaidPayment) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A successful payment already exists for this service request.",
		);
	}

	// 7. Generate unique merchant invoice number
	const merchantInvoiceNumber = `INV-${Date.now()}-${Math.floor(
		1000 + Math.random() * 9000,
	)}`;
	const currency = request.currency || request.service?.currency || "BDT";

	// 8. Create Payment record with status PENDING
	const payment = await prisma.payment.create({
		data: {
			serviceRequestId: request.id,
			citizenId: citizen.id,
			amount: amountToCharge,
			currency,
			status: PaymentState.PENDING,
			paymentMethod: "BKASH",
			merchantInvoiceNumber,
		},
	});

	// Log PaymentEvent (INITIATED)
	await prisma.paymentEvent.create({
		data: {
			paymentId: payment.id,
			status: PaymentState.PENDING,
			eventType: "INITIATED",
			payload: {
				merchantInvoiceNumber,
				amount: amountToCharge.toString(),
				currency,
			},
			note: "Payment attempt initialized in CityCare",
		},
	});

	// 9. Call bKash Create Payment
	try {
		const bkashRes = await createBkashPayment({
			amount: amountToCharge.toString(),
			merchantInvoiceNumber,
			currency,
		});

		if (bkashRes.statusCode !== "0000" || !bkashRes.paymentID) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentState.FAILED, failedAt: new Date() },
			});

			await prisma.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.FAILED,
					eventType: "BKASH_CREATE_FAILED",
					payload: bkashRes as unknown as Prisma.InputJsonValue,
					note: bkashRes.statusMessage || "bKash create payment failed",
				},
			});

			throw new AppError(
				httpStatus.BAD_GATEWAY,
				`bKash Payment Initiation Failed: ${bkashRes.statusMessage || "Unknown error"}`,
			);
		}

		// Save bKash payment ID
		await prisma.payment.update({
			where: { id: payment.id },
			data: { bkashPaymentId: bkashRes.paymentID },
		});

		// Log PaymentEvent (BKASH_CREATE_SUCCESS)
		await prisma.paymentEvent.create({
			data: {
				paymentId: payment.id,
				status: PaymentState.PENDING,
				eventType: "BKASH_CREATE_SUCCESS",
				payload: bkashRes as unknown as Prisma.InputJsonValue,
				note: "bKash payment checkout URL generated successfully",
			},
		});

		// Create AuditLog for PAYMENT_INITIATED
		await AuditLogService.createAuditLog({
			actorId: citizen.userId,
			action: AuditAction.PAYMENT_INITIATED,
			entityType: AuditEntity.PAYMENT,
			entityId: payment.id,
			newValue: {
				serviceRequestId: request.id,
				amount: amountToCharge.toString(),
				currency,
				merchantInvoiceNumber,
				bkashPaymentId: bkashRes.paymentID,
			},
		});

		// Return checkout URL safely (Never expose tokens or app secret)
		return {
			paymentId: payment.id,
			serviceRequestId: request.id,
			merchantInvoiceNumber,
			amount: amountToCharge.toString(),
			currency,
			bkashPaymentId: bkashRes.paymentID,
			checkoutUrl: bkashRes.bkashURL,
			status: PaymentState.PENDING,
		};
	} catch (error: any) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentState.FAILED, failedAt: new Date() },
		});

		if (error instanceof AppError) throw error;
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			`Failed to initiate bKash payment: ${error.message}`,
		);
	}
};

const handleBkashCallback = async (query: Record<string, any>) => {
	const paymentID = (query.paymentID || query.paymentId) as string;
	const rawStatus = (query.status as string) || "";
	const status = rawStatus.toLowerCase();

	if (!paymentID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid callback: paymentID query parameter is missing",
		);
	}

	// 1. Identify payment record
	const payment = await prisma.payment.findFirst({
		where: { bkashPaymentId: paymentID },
		include: { serviceRequest: true, citizen: true },
	});

	if (!payment) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			`Payment record not found for bKash paymentID: ${paymentID}`,
		);
	}

	// 2. Idempotency check: If already SUCCESS, return safe response immediately
	if (payment.status === PaymentState.SUCCESS) {
		return {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment has already been processed and verified as SUCCESS.",
			data: payment,
		};
	}

	// 3. Handle Cancelled callback from bKash
	if (status === "cancel" || status === "cancelled") {
		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentState.CANCELLED,
				failedAt: new Date(),
			},
		});

		await prisma.paymentEvent.create({
			data: {
				paymentId: payment.id,
				status: PaymentState.CANCELLED,
				eventType: "CANCELLED",
				payload: query as unknown as Prisma.InputJsonValue,
				note: "Payment cancelled by citizen at bKash checkout page",
			},
		});

		await AuditLogService.createAuditLog({
			actorId: payment.citizen.userId,
			action: AuditAction.PAYMENT_CANCELLED,
			entityType: AuditEntity.PAYMENT,
			entityId: payment.id,
		});

		return {
			success: false,
			statusCode: httpStatus.OK,
			message: "Payment was cancelled by the user.",
			data: updated,
		};
	}

	// 4. Handle Failed callback from bKash
	if (status === "failure" || status === "failed") {
		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentState.FAILED,
				failedAt: new Date(),
			},
		});

		await prisma.paymentEvent.create({
			data: {
				paymentId: payment.id,
				status: PaymentState.FAILED,
				eventType: "FAILED",
				payload: query as unknown as Prisma.InputJsonValue,
				note: "Payment failed at bKash checkout page",
			},
		});

		await AuditLogService.createAuditLog({
			actorId: payment.citizen.userId,
			action: AuditAction.PAYMENT_FAILED,
			entityType: AuditEntity.PAYMENT,
			entityId: payment.id,
		});

		return {
			success: false,
			statusCode: httpStatus.OK,
			message: "Payment failed at bKash checkout page.",
			data: updated,
		};
	}

	// 5. Execute bKash Payment if status is success
	if (status === "success" || !status) {
		await prisma.paymentEvent.create({
			data: {
				paymentId: payment.id,
				status: PaymentState.PENDING,
				eventType: "CALLBACK_RECEIVED",
				payload: query as unknown as Prisma.InputJsonValue,
				note: "bKash callback success signal received. Requesting payment execution.",
			},
		});

		let executeRes: any;
		try {
			executeRes = await executeBkashPayment(paymentID);
		} catch (err: any) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentState.FAILED, failedAt: new Date() },
			});

			await prisma.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.FAILED,
					eventType: "EXECUTE_ERROR",
					payload: { error: err.message },
					note: "Error thrown during bKash payment execution API call",
				},
			});

			throw new AppError(
				httpStatus.BAD_GATEWAY,
				`Failed to execute bKash payment: ${err.message}`,
			);
		}

		// 6. Validate gateway status & status code
		if (
			executeRes.statusCode !== "0000" ||
			executeRes.transactionStatus !== "Completed"
		) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentState.FAILED, failedAt: new Date() },
			});

			await prisma.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.FAILED,
					eventType: "EXECUTE_FAILED",
					payload: executeRes as unknown as Prisma.InputJsonValue,
					note: `bKash payment execution returned status: ${executeRes.statusMessage}`,
				},
			});

			throw new AppError(
				httpStatus.BAD_REQUEST,
				`bKash Payment execution failed: ${executeRes.statusMessage || "Unsuccessful transaction"}`,
			);
		}

		// 7. Validate Amount matching (CityCare DB amount vs bKash reported amount)
		const bKashAmount = parseFloat(executeRes.amount);
		const dbAmount = parseFloat(payment.amount.toString());

		if (Math.abs(bKashAmount - dbAmount) > 0.01) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentState.FAILED, failedAt: new Date() },
			});

			await prisma.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.FAILED,
					eventType: "AMOUNT_MISMATCH",
					payload: executeRes as unknown as Prisma.InputJsonValue,
					note: `CRITICAL: Amount mismatch! CityCare expected ${dbAmount} BDT, bKash reported ${bKashAmount} BDT`,
				},
			});

			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Payment security validation failed: Amount mismatch between bKash transaction and CityCare record.",
			);
		}

		// 8. Validate payment ID and merchant invoice
		if (
			executeRes.paymentID !== payment.bkashPaymentId ||
			executeRes.merchantInvoiceNumber !== payment.merchantInvoiceNumber
		) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentState.FAILED, failedAt: new Date() },
			});

			await prisma.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.FAILED,
					eventType: "METADATA_MISMATCH",
					payload: executeRes as unknown as Prisma.InputJsonValue,
					note: "Payment metadata mismatch (invoice or paymentID)",
				},
			});

			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Payment security validation failed: Merchant invoice or payment ID mismatch.",
			);
		}

		// 9. Atomic Transaction: Payment -> SUCCESS, PaymentEvent -> SUCCESS, ServiceRequest.paymentStatus -> PAID
		const successResult = await prisma.$transaction(async (tx) => {
			const updatedPayment = await tx.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentState.SUCCESS,
					bkashTransactionId: executeRes.trxID,
					completedAt: new Date(),
				},
			});

			await tx.paymentEvent.create({
				data: {
					paymentId: payment.id,
					status: PaymentState.SUCCESS,
					eventType: "SUCCESS",
					payload: executeRes as unknown as Prisma.InputJsonValue,
					note: `bKash Payment verified and completed. Transaction ID: ${executeRes.trxID}`,
				},
			});

			await tx.serviceRequest.update({
				where: { id: payment.serviceRequestId },
				data: {
					paymentStatus: PaymentStatus.PAID,
				},
			});

			await AuditLogService.createAuditLog(
				{
					actorId: payment.citizen.userId,
					action: AuditAction.PAYMENT_SUCCESS,
					entityType: AuditEntity.PAYMENT,
					entityId: payment.id,
					newValue: {
						serviceRequestId: payment.serviceRequestId,
						bkashTransactionId: executeRes.trxID,
						amount: executeRes.amount,
						paymentStatus: "PAID",
					},
				},
				tx,
			);

			return updatedPayment;
		});

		return {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment successfully verified and completed.",
			data: successResult,
		};
	}

	throw new AppError(
		httpStatus.BAD_REQUEST,
		`Unhandled callback status: ${status}`,
	);
};

const getPaymentById = async (
	id: string,
	authRole: Role,
	authUserId: string,
) => {
	const payment = await prisma.payment.findUnique({
		where: { id },
		include: {
			events: {
				orderBy: { createdAt: "asc" },
			},
			serviceRequest: {
				select: {
					id: true,
					trackingNumber: true,
					title: true,
					paymentStatus: true,
					service: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
				},
			},
			citizen: {
				select: {
					id: true,
					contactNumber: true,
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
	}

	// IDOR Protection: Citizens can only access their own payment records
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});

		if (!citizen || payment.citizenId !== citizen.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You do not have permission to view this payment record.",
			);
		}
	}

	return payment;
};

const getMyPayments = async (
	authUserId: string,
	filters: IPaymentFilterOptions,
	options: IPaginationOptions,
) => {
	const citizen = await prisma.citizen.findFirst({
		where: { userId: authUserId, isDeleted: false },
	});

	if (!citizen) {
		return {
			meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
			data: [],
		};
	}

	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { status, serviceRequestId, startDate, endDate } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: Record<string, unknown>[] = [{ citizenId: citizen.id }];

	if (status) {
		andConditions.push({ status });
	}

	if (serviceRequestId) {
		andConditions.push({ serviceRequestId });
	}

	if (startDate || endDate) {
		const dateFilter: Record<string, unknown> = {};
		if (startDate) dateFilter.gte = new Date(startDate);
		if (endDate) dateFilter.lte = new Date(endDate);
		andConditions.push({ createdAt: dateFilter });
	}

	const whereConditions = { AND: andConditions };

	const result = await prisma.payment.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: { [sortBy]: sortOrder },
		include: {
			serviceRequest: {
				select: {
					id: true,
					trackingNumber: true,
					title: true,
					paymentStatus: true,
					service: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
				},
			},
		},
	});

	const total = await prisma.payment.count({ where: whereConditions });
	const totalPages = Math.ceil(total / take);

	return {
		meta: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPages,
		},
		data: result,
	};
};

export const PaymentService = {
	initiatePayment,
	handleBkashCallback,
	getPaymentById,
	getMyPayments,
};
