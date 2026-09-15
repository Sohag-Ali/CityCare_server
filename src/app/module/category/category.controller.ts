import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICategoryFilterOptions,
	IPaginationOptions,
} from "./category.interface";
import { CategoryService } from "./category.service";

const createCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await CategoryService.createCategory(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Category created successfully",
		data: result,
	});
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
	const { page, limit, sortBy, sortOrder, searchTerm, departmentId, isActive } =
		req.query;

	const filters: ICategoryFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		departmentId: typeof departmentId === "string" ? departmentId : undefined,
		isActive: typeof isActive === "string" ? isActive : undefined,
	};

	const sortOrderVal: "asc" | "desc" | undefined =
		sortOrder === "asc" || sortOrder === "desc"
			? (sortOrder as "asc" | "desc")
			: undefined;

	const options: IPaginationOptions = {
		page: page ? Number(page) : undefined,
		limit: limit ? Number(limit) : undefined,
		sortBy: typeof sortBy === "string" ? sortBy : undefined,
		sortOrder: sortOrderVal,
	};

	const result = await CategoryService.getAllCategories(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Categories fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CategoryService.getCategoryById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category fetched successfully",
		data: result,
	});
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CategoryService.updateCategory(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category updated successfully",
		data: result,
	});
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await CategoryService.deleteCategory(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category deactivated successfully",
		data: result,
	});
});

export const CategoryController = {
	createCategory,
	getAllCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
