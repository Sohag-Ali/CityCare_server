import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IPaginationOptions } from "./municipality.interface";
import { MunicipalityService } from "./municipality.service";

const createMunicipality = catchAsync(async (req: Request, res: Response) => {
	const result = await MunicipalityService.createMunicipality(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Municipality created successfully",
		data: result,
	});
});

const getAllMunicipalities = catchAsync(async (req: Request, res: Response) => {
	const { page, limit, sortBy, sortOrder, searchTerm, country, isActive } =
		req.query;

	const filters = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		country: typeof country === "string" ? country : undefined,
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

	const result = await MunicipalityService.getAllMunicipalities(
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipalities retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMunicipalityById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await MunicipalityService.getMunicipalityById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality fetched successfully",
		data: result,
	});
});

const updateMunicipality = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await MunicipalityService.updateMunicipality(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality updated successfully",
		data: result,
	});
});

const deleteMunicipality = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await MunicipalityService.deleteMunicipality(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality deleted successfully",
		data: result,
	});
});

export const MunicipalityController = {
	createMunicipality,
	getAllMunicipalities,
	getMunicipalityById,
	updateMunicipality,
	deleteMunicipality,
};
