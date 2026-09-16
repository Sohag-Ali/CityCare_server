import httpStatus from "http-status";
import { NotificationChannel } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateNotificationInput,
	INotificationFilterOptions,
	IPaginationOptions,
} from "./notification.interface";
import { enqueueNotificationJob } from "./notification.queue";

/**
 * Dispatch notification (enqueues asynchronous background job with idempotency)
 */
const dispatchNotification = async (input: ICreateNotificationInput) => {
	try {
		let userEmail = input.userEmail;
		let userName = input.userName;

		if (!userEmail || !userName) {
			const recipientUser = await prisma.user.findUnique({
				where: { id: input.userId },
				select: { email: true, name: true },
			});
			if (recipientUser) {
				userEmail = userEmail || recipientUser.email;
				userName = userName || recipientUser.name;
			}
		}

		const channel = input.channel || NotificationChannel.IN_APP;
		const idempotencyKey = `${input.type}:${input.entityType || ""}:${input.entityId || ""}:${input.userId}:${channel}`;

		await enqueueNotificationJob({
			idempotencyKey,
			userId: input.userId,
			type: input.type,
			title: input.title,
			message: input.message,
			entityType: input.entityType,
			entityId: input.entityId,
			channel,
			userEmail,
			userName,
		});
	} catch (error) {
		console.error("[NotificationService] Dispatch error:", error);
	}
};

/**
 * Get authenticated user's notifications (Strict IDOR Scoping)
 */
const getUserNotifications = async (
	authUserId: string,
	filters: INotificationFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 20,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { isRead, type } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	// Mandatory IDOR Scoping: Only recipient user can access their notifications
	const andConditions: Record<string, unknown>[] = [{ userId: authUserId }];

	if (isRead !== undefined) {
		const isReadBool =
			typeof isRead === "boolean"
				? isRead
				: isRead === "true" || isRead === "1";
		andConditions.push({ isRead: isReadBool });
	}

	if (type) {
		andConditions.push({ type });
	}

	const whereConditions = { AND: andConditions };

	const result = await prisma.notification.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: { [sortBy]: sortOrder },
	});

	const total = await prisma.notification.count({ where: whereConditions });
	const totalPages = Math.ceil(total / take);

	return {
		meta: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPages,
		},
		data: result,
	};
};

/**
 * Get unread notifications count for authenticated user
 */
const getUnreadCount = async (authUserId: string) => {
	const unreadCount = await prisma.notification.count({
		where: {
			userId: authUserId,
			isRead: false,
		},
	});

	return { unreadCount };
};

/**
 * Mark a single notification as read (Strict IDOR Enforcement)
 */
const markAsRead = async (notificationId: string, authUserId: string) => {
	const notification = await prisma.notification.findUnique({
		where: { id: notificationId },
	});

	if (!notification) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	// IDOR Protection: User can only mark their own notification as read
	if (notification.userId !== authUserId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You do not have permission to access this notification.",
		);
	}

	const updated = await prisma.notification.update({
		where: { id: notificationId },
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	return updated;
};

/**
 * Mark all unread notifications as read for authenticated user
 */
const markAllAsRead = async (authUserId: string) => {
	const result = await prisma.notification.updateMany({
		where: {
			userId: authUserId,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	return {
		count: result.count,
	};
};

export const NotificationService = {
	dispatchNotification,
	getUserNotifications,
	getUnreadCount,
	markAsRead,
	markAllAsRead,
};
