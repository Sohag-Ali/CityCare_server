import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SlaService } from "./sla.service";

const getRequestSlaStatus = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;

	const result = await SlaService.checkSlaStatus(
		requestId,
		authUserId,
		authRole,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request SLA status retrieved successfully",
		data: result,
	});
});

const getAllPolicies = catchAsync(async (_req: Request, res: Response) => {
	const result = await SlaService.getAllPolicies();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA policies retrieved successfully",
		data: result,
	});
});

const createPolicy = catchAsync(async (req: Request, res: Response) => {
	const authRole = req.user?.role as Role;
	const payload = req.body;

	const result = await SlaService.createPolicy(authRole, payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "SLA policy created successfully",
		data: result,
	});
});

const updatePolicy = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params as { id: string };
	const authRole = req.user?.role as Role;
	const payload = req.body;

	const result = await SlaService.updatePolicy(id, authRole, payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA policy updated successfully",
		data: result,
	});
});

export const SlaController = {
	getRequestSlaStatus,
	getAllPolicies,
	createPolicy,
	updatePolicy,
};
