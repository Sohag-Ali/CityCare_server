import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { AssignmentStatus, Role } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AssignmentService } from "./assignment.service";

const assignTechnician = catchAsync(async (req: Request, res: Response) => {
	const authRole = req.user?.role as Role;
	const authUserId = req.user?.userId as string;
	const requestId = req.params.id as string;

	const result = await AssignmentService.assignTechnician(
		requestId,
		authRole,
		authUserId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician assigned successfully",
		data: result,
	});
});

const acceptAssignment = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const assignmentId = req.params.id as string;

	const result = await AssignmentService.acceptAssignment(
		assignmentId,
		authUserId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment accepted successfully",
		data: result,
	});
});

const getMyAssignments = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const filters = {
		status: req.query.status as AssignmentStatus | undefined,
		searchTerm: req.query.searchTerm as string | undefined,
	};

	const result = await AssignmentService.getMyAssignments(authUserId, filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My assignments retrieved successfully",
		data: result,
	});
});

const getEligibleTechnicians = catchAsync(
	async (req: Request, res: Response) => {
		const authRole = req.user?.role as Role;
		const authUserId = req.user?.userId as string;
		const filters = {
			departmentId: req.query.departmentId as string | undefined,
			searchTerm: req.query.searchTerm as string | undefined,
		};

		const result = await AssignmentService.getEligibleTechnicians(
			authUserId,
			authRole,
			filters,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Eligible technicians retrieved successfully",
			data: result,
		});
	},
);

export const AssignmentController = {
	assignTechnician,
	acceptAssignment,
	getMyAssignments,
	getEligibleTechnicians,
};
