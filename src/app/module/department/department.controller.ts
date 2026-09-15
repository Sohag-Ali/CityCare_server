import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IDepartmentFilterOptions,
	IPaginationOptions,
} from "./department.interface";
import { DepartmentService } from "./department.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.createDepartment(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Department created successfully",
		data: result,
	});
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		municipalityId,
		isActive,
	} = req.query;

	const filters: IDepartmentFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		municipalityId:
			typeof municipalityId === "string" ? municipalityId : undefined,
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

	const result = await DepartmentService.getAllDepartments(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Departments retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.getDepartmentById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department fetched successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.updateDepartment(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department updated successfully",
		data: result,
	});
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await DepartmentService.deleteDepartment(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department deactivated successfully",
		data: result,
	});
});

export const DepartmentController = {
	createDepartment,
	getAllDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
