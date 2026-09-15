import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import {
	PaymentStatus,
	Prisma,
	RequestStatus,
	Role,
	ServicePriority,
} from "../../../generated/prisma/client";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IAttachmentInput,
	ICreateServiceRequestPayload,
	IPaginationOptions,
	IServiceRequestFilterOptions,
	IUpdateServiceRequestPayload,
} from "./serviceRequest.interface";

const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					resource_type: "auto",
					folder: "citycare/service_requests",
				},
				(error, result) => {
					if (error) return reject(error);
					if (!result)
						return reject(new Error("No result returned from Cloudinary"));
					resolve(result);
				},
			)
			.end(buffer);
	});
};

const createServiceRequest = async (
	authUserId: string,
	payload: ICreateServiceRequestPayload,
	uploadedFiles?: Express.Multer.File[],
) => {
	// 1. Verify citizen profile exists for authUserId
	const citizen = await prisma.citizen.findFirst({
		where: {
			userId: authUserId,
			isDeleted: false,
		},
	});

	if (!citizen) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Citizen profile not found. Only registered citizens can create service requests.",
		);
	}

	// 2. Verify service exists, active, and inspect category/department/municipality
	const service = await prisma.municipalService.findFirst({
		where: {
			id: payload.serviceId,
			isDeleted: false,
		},
		include: {
			category: {
				include: {
					department: {
						include: {
							municipality: true,
						},
					},
				},
			},
		},
	});

	if (!service) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipal service not found");
	}

	if (!service.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request for an inactive municipal service",
		);
	}

	const category = service.category;
	if (!category || category.isDeleted || !category.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request under an inactive or deleted service category",
		);
	}

	const department = category.department;
	if (!department || department.isDeleted || !department.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request under an inactive or deleted department",
		);
	}

	const serviceMunicipality = department.municipality;
	if (
		!serviceMunicipality ||
		serviceMunicipality.isDeleted ||
		!serviceMunicipality.isActive
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request under an inactive or deleted municipality",
		);
	}

	// 3. Verify Ward exists, active, and check municipality relationship
	const ward = await prisma.ward.findFirst({
		where: {
			id: payload.location.wardId,
			isDeleted: false,
		},
		include: {
			municipality: true,
		},
	});

	if (!ward) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	}

	if (!ward.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request in an inactive ward",
		);
	}

	if (
		!ward.municipality ||
		ward.municipality.isDeleted ||
		!ward.municipality.isActive
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot submit request in a ward under an inactive municipality",
		);
	}

	// SPATIAL HIERARCHY VALIDATION: Ward municipality MUST match Service department municipality
	if (ward.municipalityId !== serviceMunicipality.id) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Selected ward does not belong to the municipality responsible for this service",
		);
	}

	// 4. FREE vs PAID Determination from Database (Never trust client input)
	const isPaid = service.isPaid;
	let amount: Prisma.Decimal | null = null;
	let currency: string | null = null;
	let paymentStatus: PaymentStatus = PaymentStatus.NOT_REQUIRED;

	if (isPaid) {
		if (service.baseFee === null || service.baseFee === undefined) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Paid service configuration missing base fee",
			);
		}
		amount = new Prisma.Decimal(service.baseFee);
		currency = service.currency || serviceMunicipality.currency || "BDT";
		paymentStatus = PaymentStatus.PENDING;
	}

	// 5. Handle File Uploads (Cloudinary + metadata)
	const attachmentRecords: IAttachmentInput[] = payload.attachments
		? [...payload.attachments]
		: [];

	if (uploadedFiles && uploadedFiles.length > 0) {
		for (const file of uploadedFiles) {
			try {
				const uploaded = await uploadToCloudinary(file.buffer);
				attachmentRecords.push({
					fileUrl: uploaded.secure_url,
					filePublicId: uploaded.public_id,
					fileName: file.originalname,
					fileType: file.mimetype,
					fileSize: file.size,
				});
			} catch (err) {
				console.error("Cloudinary upload failed:", err);
				throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"Failed to upload attachment file to cloud storage",
				);
			}
		}
	}

	const priority = payload.priority || ServicePriority.MEDIUM;

	// 6. Safe Atomic Creation with Tracking Number Generation in Prisma Transaction
	const newRequest = await prisma.$transaction(async (tx) => {
		const currentYear = new Date().getFullYear();

		const counter = await tx.serviceRequestCounter.upsert({
			where: { year: currentYear },
			update: { count: { increment: 1 } },
			create: { year: currentYear, count: 1 },
		});

		const trackingNumber = `CC-${currentYear}-${String(counter.count).padStart(6, "0")}`;

		const created = await tx.serviceRequest.create({
			data: {
				trackingNumber,
				citizenId: citizen.id,
				serviceId: service.id,
				title: payload.title.trim(),
				description: payload.description.trim(),
				priority,
				status: RequestStatus.SUBMITTED,
				isPaid,
				amount,
				currency,
				paymentStatus,
				location: {
					create: {
						wardId: ward.id,
						address: payload.location.address.trim(),
						area: payload.location.area?.trim(),
						latitude: payload.location.latitude,
						longitude: payload.location.longitude,
					},
				},
				attachments: attachmentRecords.length
					? {
							create: attachmentRecords.map((att) => ({
								fileUrl: att.fileUrl,
								filePublicId: att.filePublicId,
								fileName: att.fileName,
								fileType: att.fileType,
								fileSize: att.fileSize,
							})),
						}
					: undefined,
			},
			include: {
				location: {
					include: {
						ward: {
							select: {
								id: true,
								name: true,
								code: true,
								wardNumber: true,
								municipality: {
									select: {
										id: true,
										name: true,
										code: true,
									},
								},
							},
						},
					},
				},
				attachments: true,
				service: {
					select: {
						id: true,
						name: true,
						code: true,
						isPaid: true,
						baseFee: true,
						currency: true,
						category: {
							select: {
								id: true,
								name: true,
								code: true,
								department: {
									select: {
										id: true,
										name: true,
										code: true,
									},
								},
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

		return created;
	});

	return newRequest;
};

const getAllServiceRequests = async (
	authRole: Role,
	authUserId: string,
	filters: IServiceRequestFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const {
		searchTerm,
		status,
		serviceId,
		categoryId,
		wardId,
		municipalityId,
		priority,
		isPaid,
		paymentStatus,
		startDate,
		endDate,
	} = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: Record<string, unknown>[] = [{ isDeleted: false }];

	// Role Scoping
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (!citizen) {
			return {
				meta: {
					page: Number(page),
					limit: Number(limit),
					total: 0,
					totalPages: 0,
				},
				data: [],
			};
		}
		andConditions.push({ citizenId: citizen.id });
	} else if (authRole === Role.STAFF) {
		const staff = await prisma.staffProfile.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (staff) {
			andConditions.push({
				service: {
					category: {
						departmentId: staff.departmentId,
					},
				},
			});
		}
	}

	// Filter parameters
	if (status) {
		andConditions.push({ status });
	}

	if (priority) {
		andConditions.push({ priority });
	}

	if (serviceId) {
		andConditions.push({ serviceId });
	}

	if (categoryId) {
		andConditions.push({
			service: {
				categoryId,
			},
		});
	}

	if (wardId) {
		andConditions.push({
			location: {
				wardId,
			},
		});
	}

	if (municipalityId) {
		andConditions.push({
			location: {
				ward: {
					municipalityId,
				},
			},
		});
	}

	if (isPaid !== undefined) {
		andConditions.push({ isPaid: isPaid === "true" });
	}

	if (paymentStatus) {
		andConditions.push({ paymentStatus });
	}

	if (startDate || endDate) {
		const dateFilter: Record<string, unknown> = {};
		if (startDate) dateFilter.gte = new Date(startDate);
		if (endDate) dateFilter.lte = new Date(endDate);
		andConditions.push({ createdAt: dateFilter });
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ trackingNumber: { contains: searchTerm, mode: "insensitive" } },
				{ title: { contains: searchTerm, mode: "insensitive" } },
				{ description: { contains: searchTerm, mode: "insensitive" } },
				{
					location: {
						address: { contains: searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	const whereConditions =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.serviceRequest.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			location: {
				include: {
					ward: {
						select: {
							id: true,
							name: true,
							code: true,
							wardNumber: true,
							municipality: {
								select: {
									id: true,
									name: true,
									code: true,
								},
							},
						},
					},
				},
			},
			attachments: true,
			service: {
				select: {
					id: true,
					name: true,
					code: true,
					isPaid: true,
					baseFee: true,
					currency: true,
					category: {
						select: {
							id: true,
							name: true,
							code: true,
							department: {
								select: {
									id: true,
									name: true,
									code: true,
								},
							},
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

	const total = await prisma.serviceRequest.count({
		where: whereConditions,
	});

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

const getMyServiceRequests = async (
	authUserId: string,
	filters: IServiceRequestFilterOptions,
	options: IPaginationOptions,
) => {
	return getAllServiceRequests(Role.CITIZEN, authUserId, filters, options);
};

const getServiceRequestById = async (
	id: string,
	authRole: Role,
	authUserId: string,
) => {
	const request = await prisma.serviceRequest.findFirst({
		where: {
			OR: [{ id }, { trackingNumber: id }],
			isDeleted: false,
		},
		include: {
			location: {
				include: {
					ward: {
						select: {
							id: true,
							name: true,
							code: true,
							wardNumber: true,
							municipality: {
								select: {
									id: true,
									name: true,
									code: true,
								},
							},
						},
					},
				},
			},
			attachments: true,
			service: {
				select: {
					id: true,
					name: true,
					code: true,
					isPaid: true,
					baseFee: true,
					currency: true,
					category: {
						select: {
							id: true,
							name: true,
							code: true,
							department: {
								select: {
									id: true,
									name: true,
									code: true,
								},
							},
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

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	// Security & Permission Checks
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (!citizen || request.citizenId !== citizen.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You do not have permission to view another citizen's request.",
			);
		}
	} else if (authRole === Role.STAFF) {
		const staff = await prisma.staffProfile.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (
			!staff ||
			request.service.category.department.id !== staff.departmentId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You do not have permission to view service requests outside your department.",
			);
		}
	}

	return request;
};

const updateServiceRequest = async (
	id: string,
	authUserId: string,
	payload: IUpdateServiceRequestPayload,
) => {
	const citizen = await prisma.citizen.findFirst({
		where: { userId: authUserId, isDeleted: false },
	});

	if (!citizen) {
		throw new AppError(httpStatus.FORBIDDEN, "Citizen profile not found.");
	}

	const existingRequest = await prisma.serviceRequest.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		include: {
			location: true,
			service: {
				include: {
					category: {
						include: {
							department: true,
						},
					},
				},
			},
		},
	});

	if (!existingRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (existingRequest.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You can only update your own service requests.",
		);
	}

	if (existingRequest.status !== RequestStatus.SUBMITTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request cannot be updated because its current status is '${existingRequest.status}'. Updates are only permitted in 'SUBMITTED' status.`,
		);
	}

	const updatedData: Record<string, unknown> = {};

	if (payload.title !== undefined) {
		updatedData.title = payload.title.trim();
	}

	if (payload.description !== undefined) {
		updatedData.description = payload.description.trim();
	}

	if (payload.priority !== undefined) {
		updatedData.priority = payload.priority;
	}

	if (payload.location) {
		let targetWardId = existingRequest.location?.wardId;
		if (payload.location.wardId) {
			const targetWard = await prisma.ward.findFirst({
				where: {
					id: payload.location.wardId,
					isDeleted: false,
					isActive: true,
				},
			});
			if (!targetWard) {
				throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
			}
			if (
				targetWard.municipalityId !==
				existingRequest.service.category.department.municipalityId
			) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"Selected ward does not belong to the municipality responsible for this service",
				);
			}
			targetWardId = targetWard.id;
		}

		updatedData.location = {
			update: {
				wardId: targetWardId,
				address:
					payload.location.address?.trim() ?? existingRequest.location?.address,
				area: payload.location.area?.trim() ?? existingRequest.location?.area,
				latitude:
					payload.location.latitude ?? existingRequest.location?.latitude,
				longitude:
					payload.location.longitude ?? existingRequest.location?.longitude,
			},
		};
	}

	const result = await prisma.serviceRequest.update({
		where: { id },
		data: updatedData,
		include: {
			location: {
				include: {
					ward: true,
				},
			},
			attachments: true,
			service: true,
			citizen: true,
		},
	});

	return result;
};

const cancelServiceRequest = async (id: string, authUserId: string) => {
	const citizen = await prisma.citizen.findFirst({
		where: { userId: authUserId, isDeleted: false },
	});

	if (!citizen) {
		throw new AppError(httpStatus.FORBIDDEN, "Citizen profile not found.");
	}

	const existingRequest = await prisma.serviceRequest.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (existingRequest.citizenId !== citizen.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You can only cancel your own service requests.",
		);
	}

	if (
		existingRequest.status !== RequestStatus.SUBMITTED &&
		existingRequest.status !== RequestStatus.UNDER_REVIEW
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request cannot be cancelled because its current status is '${existingRequest.status}'.`,
		);
	}

	const updatedPaymentStatus =
		existingRequest.paymentStatus === PaymentStatus.PENDING
			? PaymentStatus.CANCELLED
			: existingRequest.paymentStatus;

	const result = await prisma.serviceRequest.update({
		where: { id },
		data: {
			status: RequestStatus.CANCELLED,
			paymentStatus: updatedPaymentStatus,
		},
		include: {
			location: true,
			service: true,
		},
	});

	return result;
};

export const ServiceRequestService = {
	createServiceRequest,
	getAllServiceRequests,
	getMyServiceRequests,
	getServiceRequestById,
	updateServiceRequest,
	cancelServiceRequest,
};
