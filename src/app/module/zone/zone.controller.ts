import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IPaginationOptions, IZoneFilterOptions } from "./zone.interface";
import { ZoneService } from "./zone.service";

const createZone = catchAsync(async (req: Request, res: Response) => {
	const result = await ZoneService.createZone(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Zone created successfully",
		data: result,
	});
});

const getAllZones = catchAsync(async (req: Request, res: Response) => {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		municipalityId,
		isActive,
	} = req.query;

	const filters: IZoneFilterOptions = {
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

	const result = await ZoneService.getAllZones(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zones retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getZoneById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ZoneService.getZoneById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone fetched successfully",
		data: result,
	});
});

const updateZone = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ZoneService.updateZone(id, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone updated successfully",
		data: result,
	});
});

const deleteZone = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await ZoneService.deleteZone(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone deactivated successfully",
		data: result,
	});
});

export const ZoneController = {
	createZone,
	getAllZones,
	getZoneById,
	updateZone,
	deleteZone,
};
