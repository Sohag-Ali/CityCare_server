import type { Request } from "express";
import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IAuditLogFilterOptions,
	ICreateAuditLogPayload,
	IPaginationOptions,
} from "./auditLog.interface";

const SENSITIVE_KEYS = new Set([
	"password",
	"passwordhash",
	"hashedpassword",
	"token",
	"accesstoken",
	"refreshtoken",
	"otp",
	"secret",
	"appsecret",
	"app_secret",
	"bkash_password",
	"bkash_app_secret",
	"smtp_password",
	"redis_password",
]);

/**
 * Recursively sanitize objects to prevent logging sensitive secrets/credentials
 */
const sanitizeAuditData = (val: any): any => {
	if (val === null || val === undefined) return null;

	if (typeof val === "bigint") return val.toString();

	if (typeof val === "object") {
		// Handle Prisma Decimal
		if ("s" in val && "e" in val && "d" in val) {
			return val.toString();
		}

		if (Array.isArray(val)) {
			return val.map((item) => sanitizeAuditData(item));
		}

		const cleaned: Record<string, any> = {};
		for (const key of Object.keys(val)) {
			const lowerKey = key.toLowerCase();
			if (SENSITIVE_KEYS.has(lowerKey)) {
				cleaned[key] = "[REDACTED]";
			} else {
				cleaned[key] = sanitizeAuditData(val[key]);
			}
		}
		return cleaned;
	}

	return val;
};

/**
 * Helper to safely extract IP and User-Agent from Express Request
 */
const extractClientInfo = (req?: Request) => {
	if (!req) return { ipAddress: null, userAgent: null };

	const xForwardedFor = req.headers["x-forwarded-for"];
	const ipAddress =
		typeof xForwardedFor === "string"
			? xForwardedFor.split(",")[0].trim()
			: req.ip || req.socket?.remoteAddress || null;

	const userAgent = (req.headers["user-agent"] as string) || null;

	return { ipAddress, userAgent };
};

/**
 * Create an AuditLog entry
 */
const createAuditLog = async (
	payload: ICreateAuditLogPayload,
	tx?: Prisma.TransactionClient,
) => {
	const db = tx || prisma;

	const sanitizedOldValue = payload.oldValue
		? sanitizeAuditData(payload.oldValue)
		: null;
	const sanitizedNewValue = payload.newValue
		? sanitizeAuditData(payload.newValue)
		: null;

	return await db.auditLog.create({
		data: {
			actorId: payload.actorId || null,
			action: payload.action,
			entityType: payload.entityType,
			entityId: payload.entityId || null,
			oldValue: sanitizedOldValue ?? undefined,
			newValue: sanitizedNewValue ?? undefined,
			ipAddress: payload.ipAddress || null,
			userAgent: payload.userAgent || null,
		},
	});
};

/**
 * Get all Audit Logs with filtering and pagination (ADMIN only)
 */
const getAllAuditLogs = async (
	filters: IAuditLogFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const {
		action,
		entityType,
		actorId,
		entityId,
		startDate,
		endDate,
		searchTerm,
	} = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: Record<string, unknown>[] = [];

	if (action) {
		andConditions.push({ action });
	}

	if (entityType) {
		andConditions.push({ entityType });
	}

	if (actorId) {
		andConditions.push({ actorId });
	}

	if (entityId) {
		andConditions.push({ entityId });
	}

	if (startDate || endDate) {
		const dateFilter: Record<string, unknown> = {};
		if (startDate) dateFilter.gte = new Date(startDate);
		if (endDate) dateFilter.lte = new Date(endDate);
		andConditions.push({ createdAt: dateFilter });
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ entityId: { contains: searchTerm, mode: "insensitive" } },
				{ ipAddress: { contains: searchTerm, mode: "insensitive" } },
				{ userAgent: { contains: searchTerm, mode: "insensitive" } },
				{
					actor: {
						name: { contains: searchTerm, mode: "insensitive" },
					},
				},
				{
					actor: {
						email: { contains: searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	const whereConditions =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.auditLog.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: { [sortBy]: sortOrder },
		include: {
			actor: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	const total = await prisma.auditLog.count({ where: whereConditions });
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
 * Get single AuditLog by ID (ADMIN only)
 */
const getAuditLogById = async (id: string) => {
	const log = await prisma.auditLog.findUnique({
		where: { id },
		include: {
			actor: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	if (!log) {
		throw new AppError(httpStatus.NOT_FOUND, "Audit log record not found");
	}

	return log;
};

export const AuditLogService = {
	createAuditLog,
	extractClientInfo,
	getAllAuditLogs,
	getAuditLogById,
};
