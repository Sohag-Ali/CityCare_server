import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICategoryFilterOptions,
	ICreateCategoryPayload,
	IPaginationOptions,
	IUpdateCategoryPayload,
} from "./category.interface";

const createCategory = async (payload: ICreateCategoryPayload) => {
	// 1. Verify department exists and is active
	const department = await prisma.department.findFirst({
		where: {
			id: payload.departmentId,
			isDeleted: false,
		},
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (!department.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create category under an inactive department",
		);
	}

	const normalizedCode = payload.code.trim().toUpperCase();

	// 2. Verify code uniqueness within Department
	const existingCategory = await prisma.category.findFirst({
		where: {
			departmentId: payload.departmentId,
			code: normalizedCode,
			isDeleted: false,
		},
	});

	if (existingCategory) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Category with code '${normalizedCode}' already exists in this department`,
		);
	}

	const result = await prisma.category.create({
		data: {
			departmentId: payload.departmentId,
			name: payload.name.trim(),
			code: normalizedCode,
			description: payload.description,
		},
	});

	return result;
};

const getAllCategories = async (
	filters: ICategoryFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { departmentId, isActive, searchTerm } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (departmentId) {
		andConditions.push({ departmentId });
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

	const result = await prisma.category.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		select: {
			id: true,
			departmentId: true,
			name: true,
			code: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	});

	const total = await prisma.category.count({
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

const getCategoryById = async (id: string) => {
	const category = await prisma.category.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		select: {
			id: true,
			departmentId: true,
			name: true,
			code: true,
			description: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
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
						},
					},
				},
			},
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
	const existingCategory = await prisma.category.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingCategory) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	if (!existingCategory.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update an inactive category",
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

		const duplicateCategory = await prisma.category.findFirst({
			where: {
				departmentId: existingCategory.departmentId,
				code: normalizedCode,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateCategory) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Category with code '${normalizedCode}' already exists in this department`,
			);
		}

		updatedData.code = normalizedCode;
	}

	const result = await prisma.category.update({
		where: {
			id,
		},
		data: updatedData,
	});

	return result;
};

const deleteCategory = async (id: string) => {
	const existingCategory = await prisma.category.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		include: {
			services: {
				where: {
					isActive: true,
					isDeleted: false,
				},
			},
		},
	});

	if (!existingCategory) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	if (!existingCategory.isActive) {
		throw new AppError(httpStatus.BAD_REQUEST, "Category is already inactive");
	}

	if (existingCategory.services.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot deactivate category while active municipal services exist under it",
		);
	}

	const result = await prisma.category.update({
		where: {
			id,
		},
		data: {
			isActive: false,
		},
	});

	return result;
};

export const CategoryService = {
	createCategory,
	getAllCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
