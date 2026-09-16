import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { NotificationType } from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	INotificationFilterOptions,
	IPaginationOptions,
} from "./notification.interface";
import { NotificationService } from "./notification.service";

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;

	const { isRead, type } = req.query;
	const filters: INotificationFilterOptions = {
		isRead: isRead as string,
		type: type as NotificationType,
	};

	const { page, limit, sortBy, sortOrder } = req.query;
	const options: IPaginationOptions = {
		page: page ? Number(page) : 1,
		limit: limit ? Number(limit) : 20,
		sortBy: (sortBy as string) || "createdAt",
		sortOrder: (sortOrder as "asc" | "desc") || "desc",
	};

	const result = await NotificationService.getUserNotifications(
		authUserId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const result = await NotificationService.getUnreadCount(authUserId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Unread notifications count fetched successfully",
		data: result,
	});
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const id = req.params.id as string;

	const result = await NotificationService.markAsRead(id, authUserId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification marked as read successfully",
		data: result,
	});
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;
	const result = await NotificationService.markAllAsRead(authUserId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All unread notifications marked as read successfully",
		data: result,
	});
});

export const NotificationController = {
	getUserNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
};
