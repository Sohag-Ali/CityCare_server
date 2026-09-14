import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateMunicipalityPayload,
	IMunicipalityFilterOptions,
	IPaginationOptions,
	IUpdateMunicipalityPayload,
} from "./municipality.interface";

const createMunicipality = async (payload: ICreateMunicipalityPayload) => {
	const normalizedCode = payload.code.trim().toUpperCase();

	const existingMunicipality = await prisma.municipality.findUnique({
		where: {
			code: normalizedCode,
		},
	});

	if (existingMunicipality) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Municipality with code '${normalizedCode}' already exists`,
		);
	}

	const result = await prisma.municipality.create({
		data: {
			...payload,
			code: normalizedCode,
		},
	});

	return result;
};

const getAllMunicipalities = async (
	filters: IMunicipalityFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { searchTerm, country, isActive } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ code: { contains: searchTerm, mode: "insensitive" } },
				{ country: { contains: searchTerm, mode: "insensitive" } },
			],
		});
	}

	if (country) {
		andConditions.push({
			country: { equals: country, mode: "insensitive" },
		});
	}

	if (isActive !== undefined) {
		andConditions.push({
			isActive: isActive === "true",
		});
	}

	const whereConditions =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.municipality.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
	});

	const total = await prisma.municipality.count({
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

const getMunicipalityById = async (id: string) => {
	const municipality = await prisma.municipality.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!municipality) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	return municipality;
};

const updateMunicipality = async (
	id: string,
	payload: IUpdateMunicipalityPayload,
) => {
	const existingMunicipality = await prisma.municipality.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingMunicipality) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	const updatedData: Record<string, any> = { ...payload };

	if (payload.code) {
		const normalizedCode = payload.code.trim().toUpperCase();

		const duplicateCode = await prisma.municipality.findFirst({
			where: {
				code: normalizedCode,
				NOT: {
					id,
				},
			},
		});

		if (duplicateCode) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Municipality with code '${normalizedCode}' already exists`,
			);
		}

		updatedData.code = normalizedCode;
	}

	const result = await prisma.municipality.update({
		where: {
			id,
		},
		data: updatedData,
	});

	return result;
};

const deleteMunicipality = async (id: string) => {
	const existingMunicipality = await prisma.municipality.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingMunicipality) {
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	const result = await prisma.municipality.update({
		where: {
			id,
		},
		data: {
			isDeleted: true,
			isActive: false,
			deletedAt: new Date(),
		},
	});

	return result;
};

export const MunicipalityService = {
	createMunicipality,
	getAllMunicipalities,
	getMunicipalityById,
	updateMunicipality,
	deleteMunicipality,
};
