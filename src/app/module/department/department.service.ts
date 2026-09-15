import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateDepartmentPayload,
	IDepartmentFilterOptions,
	IPaginationOptions,
	IUpdateDepartmentPayload,
} from "./department.interface";

const createDepartment = async (payload: ICreateDepartmentPayload) => {
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
			"Cannot create department under an inactive municipality",
		);
	}

	const normalizedCode = payload.code.trim().toUpperCase();

	// 2. Verify code uniqueness within municipality
	const existingDepartment = await prisma.department.findFirst({
		where: {
			municipalityId: payload.municipalityId,
			code: normalizedCode,
			isDeleted: false,
		},
	});

	if (existingDepartment) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Department with code '${normalizedCode}' already exists in this municipality`,
		);
	}

	const result = await prisma.department.create({
		data: {
			municipalityId: payload.municipalityId,
			name: payload.name.trim(),
			code: normalizedCode,
			description: payload.description,
			email: payload.email,
			phone: payload.phone,
		},
	});

	return result;
};

const getAllDepartments = async (
	filters: IDepartmentFilterOptions,
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

	const result = await prisma.department.findMany({
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
			email: true,
			phone: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	const total = await prisma.department.count({
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

const getDepartmentById = async (id: string) => {
	const department = await prisma.department.findFirst({
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
			email: true,
			phone: true,
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

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
) => {
	const existingDepartment = await prisma.department.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingDepartment) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (!existingDepartment.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update an inactive department",
		);
	}

	const updatedData: Record<string, any> = {};

	if (payload.name !== undefined) {
		updatedData.name = payload.name.trim();
	}

	if (payload.description !== undefined) {
		updatedData.description = payload.description;
	}

	if (payload.email !== undefined) {
		updatedData.email = payload.email;
	}

	if (payload.phone !== undefined) {
		updatedData.phone = payload.phone;
	}

	if (payload.code) {
		const normalizedCode = payload.code.trim().toUpperCase();

		const duplicateDepartment = await prisma.department.findFirst({
			where: {
				municipalityId: existingDepartment.municipalityId,
				code: normalizedCode,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateDepartment) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Department with code '${normalizedCode}' already exists in this municipality`,
			);
		}

		updatedData.code = normalizedCode;
	}

	const result = await prisma.department.update({
		where: {
			id,
		},
		data: updatedData,
	});

	return result;
};

const deleteDepartment = async (id: string) => {
	const existingDepartment = await prisma.department.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingDepartment) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (!existingDepartment.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Department is already inactive",
		);
	}

	const result = await prisma.department.update({
		where: {
			id,
		},
		data: {
			isActive: false,
		},
	});

	return result;
};

export const DepartmentService = {
	createDepartment,
	getAllDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
