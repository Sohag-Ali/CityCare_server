import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { UserStatus } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IAdminFilterOptions,
	IPaginationOptions,
} from "./admin.interface";
import { AdminService } from "./admin.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId;
	const clientInfo = {
		ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
		userAgent: req.headers["user-agent"] || null,
	};

	const result = await AdminService.createAdmin(
		req.body,
		authUserId,
		clientInfo,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Admin account created successfully. Activation OTP sent to Admin email.",
		data: result,
	});
});

const activateAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await AdminService.activateAdmin(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin account activated successfully. You can now log in.",
		data: result,
	});
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
	const { searchTerm, status, page, limit } = req.query;

	const filters: IAdminFilterOptions = {
		searchTerm: searchTerm as string,
		status: status as UserStatus,
	};

	const options: IPaginationOptions = {
		page: page ? Number(page) : 1,
		limit: limit ? Number(limit) : 10,
	};

	const result = await AdminService.getAllAdmins(filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin accounts retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const result = await AdminService.getAdminById(id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin account fetched successfully",
		data: result,
	});
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const authUserId = req.user?.userId;
	const clientInfo = {
		ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
		userAgent: req.headers["user-agent"] || null,
	};

	const result = await AdminService.updateAdmin(
		id,
		req.body,
		authUserId,
		clientInfo,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin account updated successfully",
		data: result,
	});
});

const activateAdminStatus = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const authUserId = req.user?.userId;
	const clientInfo = {
		ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
		userAgent: req.headers["user-agent"] || null,
	};

	const result = await AdminService.activateAdminStatus(
		id,
		authUserId,
		clientInfo,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin status activated successfully",
		data: result,
	});
});

const deactivateAdminStatus = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const authUserId = req.user?.userId;
		const clientInfo = {
			ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
			userAgent: req.headers["user-agent"] || null,
		};

		const result = await AdminService.deactivateAdminStatus(
			id,
			authUserId,
			clientInfo,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Admin status deactivated successfully",
			data: result,
		});
	},
);

export const AdminController = {
	createAdmin,
	activateAdmin,
	getAllAdmins,
	getAdminById,
	updateAdmin,
	activateAdminStatus,
	deactivateAdminStatus,
};
