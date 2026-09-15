import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateZonePayload,
	IPaginationOptions,
	IUpdateZonePayload,
	IZoneFilterOptions,
} from "./zone.interface";

const createZone = async (payload: ICreateZonePayload) => {
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
			"Cannot create zone under an inactive municipality",
		);
	}

	const normalizedCode = payload.code.trim().toUpperCase();

	const existingZone = await prisma.zone.findFirst({
		where: {
			municipalityId: payload.municipalityId,
			code: normalizedCode,
			isDeleted: false,
		},
	});

	if (existingZone) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Zone with code '${normalizedCode}' already exists in this municipality`,
		);
	}

	const result = await prisma.zone.create({
		data: {
			municipalityId: payload.municipalityId,
			name: payload.name.trim(),
			code: normalizedCode,
			description: payload.description,
		},
	});

	return result;
};

const getAllZones = async (
	filters: IZoneFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { municipalityId, isActive, searchTerm } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (municipalityId) {
		andConditions.push({ municipalityId });
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

	const result = await prisma.zone.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		select: {
			id: true,
			municipalityId: true,
			name: true,
			code: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const total = await prisma.zone.count({
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

const getZoneById = async (id: string) => {
	const zone = await prisma.zone.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		select: {
			id: true,
			municipalityId: true,
			name: true,
			code: true,
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
		},
	});

	if (!zone) {
		throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
	}

	return zone;
};

const updateZone = async (id: string, payload: IUpdateZonePayload) => {
	const existingZone = await prisma.zone.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingZone) {
		throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
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

		const duplicateZone = await prisma.zone.findFirst({
			where: {
				municipalityId: existingZone.municipalityId,
				code: normalizedCode,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateZone) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Zone with code '${normalizedCode}' already exists in this municipality`,
			);
		}

		updatedData.code = normalizedCode;
	}

	const result = await prisma.zone.update({
		where: {
			id,
		},
		data: updatedData,
	});

	return result;
};

const deleteZone = async (id: string) => {
	const existingZone = await prisma.zone.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingZone) {
		throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
	}

	const activeWardsCount = await prisma.ward.count({
		where: {
			zoneId: id,
			isDeleted: false,
			isActive: true,
		},
	});

	if (activeWardsCount > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot deactivate zone with active wards. Please deactivate or reassign wards first.",
		);
	}

	const result = await prisma.zone.update({
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

export const ZoneService = {
	createZone,
	getAllZones,
	getZoneById,
	updateZone,
	deleteZone,
};
