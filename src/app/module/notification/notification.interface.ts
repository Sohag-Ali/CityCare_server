import type {
	NotificationChannel,
	NotificationType,
} from "../../../generated/prisma/client";

export interface ICreateNotificationInput {
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	entityType?: string | null;
	entityId?: string | null;
	channel?: NotificationChannel;
	sendEmail?: boolean;
	userEmail?: string | null;
	userName?: string | null;
}

export interface INotificationFilterOptions {
	isRead?: boolean | string;
	type?: NotificationType;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface INotificationJobData {
	idempotencyKey: string;
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	entityType?: string | null;
	entityId?: string | null;
	channel: NotificationChannel;
	userEmail?: string | null;
	userName?: string | null;
}
