import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IPaginationOptions,
	IStaffFilterOptions,
} from "./staff.interface";
import { StaffService } from "./staff.service";

const createStaff = catchAsync(async (req: Request, res: Response) => {
	const result = await StaffService.createStaff(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Staff created successfully",
		data: result,
	});
});

const getAllStaff = catchAsync(async (req: Request, res: Response) => {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		departmentId,
		staffType,
		isActive,
	} = req.query;

	const filters: IStaffFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		departmentId: typeof departmentId === "string" ? departmentId : undefined,
		staffType: typeof staffType === "string" ? (staffType as any) : undefined,
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

	const result = await StaffService.getAllStaff(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff members retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getStaffById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StaffService.getStaffById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff profile fetched successfully",
		data: result,
	});
});

const updateStaff = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StaffService.updateStaff(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff profile updated successfully",
		data: result,
	});
});

const deleteStaff = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await StaffService.deleteStaff(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff profile deactivated successfully",
		data: result,
	});
});

export const StaffController = {
	createStaff,
	getAllStaff,
	getStaffById,
	updateStaff,
	deleteStaff,
};
