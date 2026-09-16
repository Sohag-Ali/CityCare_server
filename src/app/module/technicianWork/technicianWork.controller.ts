import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TechnicianWorkService } from "./technicianWork.service";

const startWork = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const note = req.body?.note;

	const result = await TechnicianWorkService.startWork(
		requestId,
		authUserId,
		authRole,
		note,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician work execution started successfully",
		data: result,
	});
});

const createTechnicianUpdate = catchAsync(
	async (req: Request, res: Response) => {
		const requestId = req.params.id as string;
		const authUserId = req.user?.userId as string;
		const authRole = req.user?.role as Role;
		const payload = req.body;
		const uploadedFiles = req.files as Express.Multer.File[] | undefined;

		const result = await TechnicianWorkService.createTechnicianUpdate(
			requestId,
			authUserId,
			authRole,
			payload,
			uploadedFiles,
		);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Technician work update added successfully",
			data: result,
		});
	},
);

const getTechnicianUpdates = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const filters = {
		page: req.query.page ? Number(req.query.page) : 1,
		limit: req.query.limit ? Number(req.query.limit) : 20,
	};

	const result = await TechnicianWorkService.getTechnicianUpdates(
		requestId,
		authUserId,
		authRole,
		filters,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician work updates retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const submitResolution = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const payload = req.body;
	const uploadedFiles = req.files as Express.Multer.File[] | undefined;

	const result = await TechnicianWorkService.submitResolution(
		requestId,
		authUserId,
		authRole,
		payload,
		uploadedFiles,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Technician resolution submitted successfully",
		data: result,
	});
});

const getResolution = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;

	const result = await TechnicianWorkService.getResolution(
		requestId,
		authUserId,
		authRole,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resolution details retrieved successfully",
		data: result,
	});
});

const uploadEvidence = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const evidenceType = req.body?.evidenceType;
	const uploadedFiles = req.files as Express.Multer.File[] | undefined;

	const result = await TechnicianWorkService.uploadEvidence(
		requestId,
		authUserId,
		authRole,
		evidenceType,
		uploadedFiles,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Work evidence photos uploaded successfully",
		data: result,
	});
});

export const TechnicianWorkController = {
	startWork,
	createTechnicianUpdate,
	getTechnicianUpdates,
	submitResolution,
	getResolution,
	uploadEvidence,
};
