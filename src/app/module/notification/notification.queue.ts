import ejs from "ejs";
import path from "path";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import type { INotificationJobData } from "./notification.interface";

const QUEUE_NAME = "citycare:notification_queue";

/**
 * Enqueue notification job to Redis list queue with Idempotency protection
 */
export const enqueueNotificationJob = async (
	jobData: INotificationJobData,
): Promise<boolean> => {
	try {
		// Idempotency check: prevent processing duplicate events within 24 hours
		if (jobData.idempotencyKey) {
			const idempotencyRedisKey = `notification:idempotency:${jobData.idempotencyKey}`;
			const isDuplicate = await redisClient.get(idempotencyRedisKey);
			if (isDuplicate) {
				console.log(
					`[NotificationQueue] Duplicate job skipped for key: ${jobData.idempotencyKey}`,
				);
				return false;
			}
			// Mark idempotency key with 24 hours TTL
			await redisClient.set(idempotencyRedisKey, "1", {
				expiration: { type: "EX", value: 60 * 60 * 24 },
			});
		}

		await redisClient.rPush(QUEUE_NAME, JSON.stringify(jobData));

		// Instantly trigger worker iteration
		processNextNotificationJob();

		return true;
	} catch (error) {
		console.error("[NotificationQueue] Failed to enqueue notification:", error);
		return false;
	}
};

/**
 * Process a single notification job: Save In-App Notification and send Email if configured
 */
export const processNotificationJob = async (jobData: INotificationJobData) => {
	try {
		// 1. Create In-App Notification in DB
		const createdNotification = await prisma.notification.create({
			data: {
				userId: jobData.userId,
				type: jobData.type,
				title: jobData.title,
				message: jobData.message,
				entityType: jobData.entityType || null,
				entityId: jobData.entityId || null,
				channel: jobData.channel,
				isRead: false,
			},
		});

		// 2. Dispatch Email if email address is provided or channel is EMAIL
		if (
			jobData.userEmail &&
			(jobData.channel === "EMAIL" || jobData.channel === "IN_APP")
		) {
			try {
				const templatePath = path.join(
					process.cwd(),
					"src/app/templates/notification-email.ejs",
				);

				const html = await ejs.renderFile(templatePath, {
					title: jobData.title,
					message: jobData.message,
					userName: jobData.userName || "User",
				});

				await transporter.sendMail({
					from: config.email_sender,
					to: jobData.userEmail,
					subject: `[CityCare] ${jobData.title}`,
					html,
				});

				console.log(
					`[NotificationWorker] Email sent to ${jobData.userEmail} for event ${jobData.type}`,
				);
			} catch (emailErr) {
				// Log email failure without corrupting DB or throwing unhandled exception
				console.error(
					`[NotificationWorker] Email dispatch failed for ${jobData.userEmail}:`,
					emailErr,
				);
			}
		}

		return createdNotification;
	} catch (err) {
		console.error(
			"[NotificationWorker] Error processing notification job:",
			err,
		);
	}
};

/**
 * Pop and process the next notification job from Redis queue
 */
export const processNextNotificationJob = async () => {
	try {
		const rawJob = await redisClient.lPop(QUEUE_NAME);
		if (!rawJob) return;

		const jobData: INotificationJobData = JSON.parse(rawJob);
		await processNotificationJob(jobData);
	} catch (error) {
		console.error("[NotificationWorker] Error popping job from queue:", error);
	}
};

/**
 * Start worker polling loop (safe background processing)
 */
let workerInterval: NodeJS.Timeout | null = null;
export const startNotificationWorker = () => {
	if (workerInterval) return;

	// Check queue every 2 seconds in background
	workerInterval = setInterval(() => {
		processNextNotificationJob();
	}, 2000);

	console.log("[NotificationWorker] Redis background worker started.");
};
