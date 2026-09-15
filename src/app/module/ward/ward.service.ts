import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateWardPayload,
	IPaginationOptions,
	IUpdateWardPayload,
	IWardFilterOptions,
} from "./ward.interface";

const createWard = async (payload: ICreateWardPayload) => {
	// 1. Verify municipality exists and is active
	const municipality = await prisma.municipality.findFirst({
		where: {
			id: payload.municipalityId,
			isDeleted: false,
		},
	});

	if (!municipality) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	if (!municipality.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create ward under an inactive municipality",
		);
	}

	// 2. Verify zone exists and is active
	const zone = await prisma.zone.findFirst({
		where: {
			id: payload.zoneId,
			isDeleted: false,
		},
	});

	if (!zone) {
		throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
	}

	if (!zone.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create ward under an inactive zone",
		);
	}

	// 3. CRITICAL DATA INTEGRITY TEST: Verify parent-child relationship
	if (zone.municipalityId !== payload.municipalityId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Zone does not belong to the specified municipality",
		);
	}

	const normalizedCode = payload.code.trim().toUpperCase();

	// 4. Verify code uniqueness within municipality
	const existingCodeWard = await prisma.ward.findFirst({
		where: {
			municipalityId: payload.municipalityId,
			code: normalizedCode,
			isDeleted: false,
		},
	});

	if (existingCodeWard) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Ward with code '${normalizedCode}' already exists in this municipality`,
		);
	}

	// 5. Verify ward number uniqueness within municipality
	const existingNumberWard = await prisma.ward.findFirst({
		where: {
			municipalityId: payload.municipalityId,
			wardNumber: payload.wardNumber,
			isDeleted: false,
		},
	});

	if (existingNumberWard) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Ward with number ${payload.wardNumber} already exists in this municipality`,
		);
	}

	const result = await prisma.ward.create({
		data: {
			municipalityId: payload.municipalityId,
			zoneId: payload.zoneId,
			name: payload.name.trim(),
			code: normalizedCode,
			wardNumber: payload.wardNumber,
			description: payload.description,
		},
	});

	return result;
};

const getAllWards = async (
	filters: IWardFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { municipalityId, zoneId, isActive, searchTerm } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (municipalityId) {
		andConditions.push({ municipalityId });
	}

	if (zoneId) {
		andConditions.push({ zoneId });
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

	const result = await prisma.ward.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		select: {
			id: true,
			municipalityId: true,
			zoneId: true,
			name: true,
			code: true,
			wardNumber: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const total = await prisma.ward.count({
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

const getWardById = async (id: string) => {
	const ward = await prisma.ward.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		select: {
			id: true,
			municipalityId: true,
			zoneId: true,
			name: true,
			code: true,
			wardNumber: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
			municipality: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
			zone: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	});

	if (!ward) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	}

	return ward;
};

const updateWard = async (id: string, payload: IUpdateWardPayload) => {
	const existingWard = await prisma.ward.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingWard) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
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

		const duplicateCodeWard = await prisma.ward.findFirst({
			where: {
				municipalityId: existingWard.municipalityId,
				code: normalizedCode,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateCodeWard) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Ward with code '${normalizedCode}' already exists in this municipality`,
			);
		}

		updatedData.code = normalizedCode;
	}

	if (payload.wardNumber !== undefined) {
		const duplicateNumberWard = await prisma.ward.findFirst({
			where: {
				municipalityId: existingWard.municipalityId,
				wardNumber: payload.wardNumber,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateNumberWard) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Ward with number ${payload.wardNumber} already exists in this municipality`,
			);
		}

		updatedData.wardNumber = payload.wardNumber;
	}

	const result = await prisma.ward.update({
		where: {
			id,
		},
		data: updatedData,
	});

	return result;
};

const deleteWard = async (id: string) => {
	const existingWard = await prisma.ward.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingWard) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	}

	const result = await prisma.ward.update({
		where: {
			id,
		},
		data: {
			isActive: false,
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	return result;
};

export const WardService = {
	createWard,
	getAllWards,
	getWardById,
	updateWard,
	deleteWard,
};
