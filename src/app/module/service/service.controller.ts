import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IPaginationOptions,
	IServiceFilterOptions,
} from "./service.interface";
import { ServiceService } from "./service.service";

const createService = catchAsync(async (req: Request, res: Response) => {
	const result = await ServiceService.createService(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Municipal service created successfully",
		data: result,
	});
});

const getAllServices = catchAsync(async (req: Request, res: Response) => {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		categoryId,
		departmentId,
		isPaid,
		isActive,
	} = req.query;

	const filters: IServiceFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		categoryId: typeof categoryId === "string" ? categoryId : undefined,
		departmentId: typeof departmentId === "string" ? departmentId : undefined,
		isPaid: typeof isPaid === "string" ? isPaid : undefined,
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

	const result = await ServiceService.getAllServices(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipal services fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ServiceService.getServiceById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipal service fetched successfully",
		data: result,
	});
});

const updateService = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ServiceService.updateService(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipal service updated successfully",
		data: result,
	});
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ServiceService.deleteService(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipal service deactivated successfully",
		data: result,
	});
});

export const ServiceController = {
	createService,
	getAllServices,
	getServiceById,
	updateService,
	deleteService,
};
