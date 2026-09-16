import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ResolutionVerificationService } from "./resolutionVerification.service";

const verifyResolution = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.id as string;
	const authUserId = req.user?.userId as string;
	const authRole = req.user?.role as Role;
	const payload = req.body;

	const result = await ResolutionVerificationService.verifyResolution(
		requestId,
		authUserId,
		authRole,
		payload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resolution verification processed successfully",
		data: result,
	});
});

export const ResolutionVerificationController = {
	verifyResolution,
};
