import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IPaginationOptions, IWardFilterOptions } from "./ward.interface";
import { WardService } from "./ward.service";

const createWard = catchAsync(async (req: Request, res: Response) => {
	const result = await WardService.createWard(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Ward created successfully",
		data: result,
	});
});

const getAllWards = catchAsync(async (req: Request, res: Response) => {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		municipalityId,
		zoneId,
		isActive,
	} = req.query;

	const filters: IWardFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		municipalityId:
			typeof municipalityId === "string" ? municipalityId : undefined,
		zoneId: typeof zoneId === "string" ? zoneId : undefined,
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

	const result = await WardService.getAllWards(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Wards retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getWardById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await WardService.getWardById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward fetched successfully",
		data: result,
	});
});

const updateWard = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await WardService.updateWard(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward updated successfully",
		data: result,
	});
});

const deleteWard = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await WardService.deleteWard(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward deactivated successfully",
		data: result,
	});
});

export const WardController = {
	createWard,
	getAllWards,
	getWardById,
	updateWard,
	deleteWard,
};
