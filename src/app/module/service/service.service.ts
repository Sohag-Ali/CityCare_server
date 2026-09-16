import httpStatus from "http-status";
import {
	AuditAction,
	AuditEntity,
	Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { AuditLogService } from "../auditLog/auditLog.service";
import type {
	ICreateServicePayload,
	IPaginationOptions,
	IServiceFilterOptions,
	IUpdateServicePayload,
} from "./service.interface";

const createService = async (
	payload: ICreateServicePayload,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	// 1. Verify Category exists and inspect parent Department & Municipality
	const category = await prisma.category.findFirst({
		where: {
			id: payload.categoryId,
			isDeleted: false,
		},
		include: {
			department: {
				include: {
					municipality: true,
				},
			},
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	if (!category.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create municipal service under an inactive category",
		);
	}

	if (
		!category.department ||
		category.department.isDeleted ||
		!category.department.isActive
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create municipal service under an inactive department",
		);
	}

	const municipality = category.department.municipality;
	if (!municipality || municipality.isDeleted || !municipality.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create municipal service under an inactive municipality",
		);
	}

	const normalizedCode = payload.code.trim().toUpperCase();

	// 2. Verify code uniqueness within Category
	const existingService = await prisma.municipalService.findFirst({
		where: {
			categoryId: payload.categoryId,
			code: normalizedCode,
			isDeleted: false,
		},
	});

	if (existingService) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Municipal service with code '${normalizedCode}' already exists in this category`,
		);
	}

	// 3. Pricing business rules
	const isPaid = payload.isPaid ?? false;
	let baseFee: Prisma.Decimal | null = null;
	let currency: string | null = null;

	if (isPaid) {
		if (payload.baseFee === undefined || payload.baseFee === null) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Base fee is required for paid services",
			);
		}
		if (payload.baseFee < 0) {
			throw new AppError(httpStatus.BAD_REQUEST, "Base fee cannot be negative");
		}
		baseFee = new Prisma.Decimal(payload.baseFee);
		currency = payload.currency?.trim() || municipality.currency || "BDT";
	}

	const result = await prisma.municipalService.create({
		data: {
			categoryId: payload.categoryId,
			name: payload.name.trim(),
			code: normalizedCode,
			description: payload.description,
			isPaid,
			baseFee,
			currency,
		},
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.CREATE,
		entityType: AuditEntity.MUNICIPAL_SERVICE,
		entityId: result.id,
		newValue: {
			name: result.name,
			code: result.code,
			isPaid: result.isPaid,
			baseFee: result.baseFee?.toString(),
			currency: result.currency,
		},
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return result;
};

const getAllServices = async (
	filters: IServiceFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { categoryId, departmentId, isPaid, isActive, searchTerm } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (categoryId) {
		andConditions.push({ categoryId });
	}

	if (departmentId) {
		andConditions.push({
			category: {
				departmentId,
			},
		});
	}

	if (isPaid !== undefined) {
		andConditions.push({
			isPaid: isPaid === "true",
		});
	}

	if (isActive !== undefined) {
		andConditions.push({
			isActive: isActive === "true",
		});
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ code: { contains: searchTerm, mode: "insensitive" } },
			],
		});
	}

	const whereConditions =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.municipalService.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		select: {
			id: true,
			categoryId: true,
			name: true,
			code: true,
			description: true,
			isPaid: true,
			baseFee: true,
			currency: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
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
	});

	const total = await prisma.municipalService.count({
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

const getServiceById = async (id: string) => {
	const service = await prisma.municipalService.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		select: {
			id: true,
			categoryId: true,
			name: true,
			code: true,
			description: true,
			isPaid: true,
			baseFee: true,
			currency: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
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
							municipality: {
								select: {
									id: true,
									name: true,
									code: true,
									currency: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!service) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipal service not found");
	}

	return service;
};

const updateService = async (
	id: string,
	payload: IUpdateServicePayload,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const existingService = await prisma.municipalService.findFirst({
		where: {
			id,
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

	if (!existingService) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipal service not found");
	}

	if (!existingService.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update an inactive municipal service",
		);
	}

	const updatedData: Record<string, any> = {};

	if (payload.name !== undefined) {
		updatedData.name = payload.name.trim();
	}

	if (payload.description !== undefined) {
		updatedData.description = payload.description;
	}

	if (payload.code) {
		const normalizedCode = payload.code.trim().toUpperCase();

		const duplicateService = await prisma.municipalService.findFirst({
			where: {
				categoryId: existingService.categoryId,
				code: normalizedCode,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateService) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Municipal service with code '${normalizedCode}' already exists in this category`,
			);
		}

		updatedData.code = normalizedCode;
	}

	// Handle paid status / pricing changes
	const targetIsPaid =
		payload.isPaid !== undefined ? payload.isPaid : existingService.isPaid;

	if (targetIsPaid) {
		updatedData.isPaid = true;
		if (payload.baseFee !== undefined) {
			if (payload.baseFee < 0) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"Base fee cannot be negative",
				);
			}
			updatedData.baseFee = new Prisma.Decimal(payload.baseFee);
		} else if (!existingService.baseFee) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Base fee is required when setting service to paid",
			);
		}

		if (payload.currency !== undefined) {
			updatedData.currency = payload.currency.trim();
		} else if (!existingService.currency) {
			updatedData.currency =
				existingService.category.department.municipality.currency || "BDT";
		}
	} else if (payload.isPaid === false) {
		updatedData.isPaid = false;
		updatedData.baseFee = null;
		updatedData.currency = null;
	}

	const result = await prisma.municipalService.update({
		where: {
			id,
		},
		data: updatedData,
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.UPDATE,
		entityType: AuditEntity.MUNICIPAL_SERVICE,
		entityId: result.id,
		oldValue: {
			name: existingService.name,
			code: existingService.code,
			isPaid: existingService.isPaid,
			baseFee: existingService.baseFee
				? existingService.baseFee.toString()
				: null,
			currency: existingService.currency,
		},
		newValue: {
			name: result.name,
			code: result.code,
			isPaid: result.isPaid,
			baseFee: result.baseFee ? result.baseFee.toString() : null,
			currency: result.currency,
		},
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return result;
};

const deleteService = async (
	id: string,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const existingService = await prisma.municipalService.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingService) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipal service not found");
	}

	if (!existingService.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Municipal service is already inactive",
		);
	}

	const result = await prisma.municipalService.update({
		where: {
			id,
		},
		data: {
			isActive: false,
		},
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.DELETE,
		entityType: AuditEntity.MUNICIPAL_SERVICE,
		entityId: result.id,
		oldValue: { isActive: true },
		newValue: { isActive: false },
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return result;
};

export const ServiceService = {
	createService,
	getAllServices,
	getServiceById,
	updateService,
	deleteService,
};
