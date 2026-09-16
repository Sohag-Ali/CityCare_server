import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { EvidenceType, Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AttachmentService } from "./attachment.service";

const uploadAttachments = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const files = (req.files as Express.Multer.File[]) || [];
	const payload = req.body || {};

	const result = await AttachmentService.uploadAttachments(
		requestId,
		authUserId,
		authRole,
		files,
		payload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Attachment(s) uploaded successfully",
		data: result,
	});
});

const getRequestAttachments = catchAsync(
	async (req: Request, res: Response) => {
		const requestId = req.params.id as string;
		const authUserId = req.user?.userId as string;
		const authRole = req.user?.role as Role;
		const attachmentType = req.query.attachmentType as EvidenceType | undefined;

		const result = await AttachmentService.getRequestAttachments(
			requestId,
			authUserId,
			authRole,
			{ attachmentType },
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Attachments retrieved successfully",
			data: result,
		});
	},
);

const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const attachmentId = req.params.attachmentId as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;

	const result = await AttachmentService.deleteAttachment(
		requestId,
		attachmentId,
		authUserId,
		authRole,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachment deleted successfully",
		data: result,
	});
});

export const AttachmentController = {
	uploadAttachments,
	getRequestAttachments,
	deleteAttachment,
};
