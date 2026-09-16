import type { Request, Response } from "express";
import httpStatus from "http-status";
import type {
	AuditAction,
	AuditEntity,
} from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IAuditLogFilterOptions,
	IPaginationOptions,
} from "./auditLog.interface";
import { AuditLogService } from "./auditLog.service";

const getAllAuditLogs = catchAsync(async (req: Request, res: Response) => {
	const {
		action,
		entityType,
		actorId,
		entityId,
		startDate,
		endDate,
		searchTerm,
	} = req.query;

	const filters: IAuditLogFilterOptions = {
		action: action as AuditAction,
		entityType: entityType as AuditEntity,
		actorId: actorId as string,
		entityId: entityId as string,
		startDate: startDate as string,
		endDate: endDate as string,
		searchTerm: searchTerm as string,
	};

	const { page, limit, sortBy, sortOrder } = req.query;
	const options: IPaginationOptions = {
		page: page ? Number(page) : 1,
		limit: limit ? Number(limit) : 10,
		sortBy: (sortBy as string) || "createdAt",
		sortOrder: (sortOrder as "asc" | "desc") || "desc",
	};

	const result = await AuditLogService.getAllAuditLogs(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Audit logs retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getAuditLogById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await AuditLogService.getAuditLogById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Audit log details fetched successfully",
		data: result,
	});
});

export const AuditLogController = {
	getAllAuditLogs,
	getAuditLogById,
};
