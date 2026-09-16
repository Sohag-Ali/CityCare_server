import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IPaginationOptions,
	IPaymentFilterOptions,
} from "./payment.interface";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const result = await PaymentService.initiatePayment(authUserId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"Payment initiated successfully. Please proceed to bKash checkout URL.",
		data: result,
	});
});

const handleBkashCallback = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.handleBkashCallback(req.query);

	sendResponse(res, {
		statusCode: result.statusCode,
		success: result.success,
		message: result.message,
		data: result.data,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const id = req.params.id as string;

	const result = await PaymentService.getPaymentById(id, authRole, authUserId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment details fetched successfully",
		data: result,
	});
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;

	const { status, serviceRequestId, startDate, endDate, searchTerm } =
		req.query;
	const filters: IPaymentFilterOptions = {
		status: status as string,
		serviceRequestId: serviceRequestId as string,
		startDate: startDate as string,
		endDate: endDate as string,
		searchTerm: searchTerm as string,
	};

	const { page, limit, sortBy, sortOrder } = req.query;
	const options: IPaginationOptions = {
		page: page ? Number(page) : 1,
		limit: limit ? Number(limit) : 10,
		sortBy: (sortBy as string) || "createdAt",
		sortOrder: (sortOrder as "asc" | "desc") || "desc",
	};

	const result = await PaymentService.getMyPayments(
		authUserId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My payments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const PaymentController = {
	initiatePayment,
	handleBkashCallback,
	getPaymentById,
	getMyPayments,
};
