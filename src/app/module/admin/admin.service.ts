import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import type { Prisma } from "../../../generated/prisma/client";
import {
	AuditAction,
	AuditEntity,
	Role,
	UserStatus,
} from "../../../generated/prisma/client";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { AuditLogService } from "../auditLog/auditLog.service";
import type {
	IActivateAdminPayload,
	IAdminFilterOptions,
	ICreateAdminPayload,
	IPaginationOptions,
	IUpdateAdminPayload,
} from "./admin.interface";

const createAdmin = async (
	payload: ICreateAdminPayload,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const normalizedEmail = payload.email.trim().toLowerCase();

	// 1. Verify email uniqueness
	const existingUser = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});

	if (existingUser) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User with this email already exists",
		);
	}

	// 2. Transaction: Create Admin User (role forced to ADMIN)
	const createdAdmin = await prisma.$transaction(async (tx) => {
		const adminUser = await tx.user.create({
			data: {
				name: payload.name.trim(),
				email: normalizedEmail,
				password: null, // Password set upon OTP activation
				role: Role.ADMIN, // Force role to ADMIN
				status: UserStatus.ACTIVE,
				emailVerified: false,
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
			},
		});

		await AuditLogService.createAuditLog(
			{
				actorId: authUserId || null,
				action: AuditAction.CREATE,
				entityType: AuditEntity.USER,
				entityId: adminUser.id,
				newValue: {
					name: adminUser.name,
					email: adminUser.email,
					role: adminUser.role,
				},
				ipAddress: clientInfo?.ipAddress,
				userAgent: clientInfo?.userAgent,
			},
			tx,
		);

		return adminUser;
	});

	// 3. Generate 6-digit Activation OTP and store in Redis
	const expirationSeconds = 5 * 60;
	const otpKey = `admin-activation-otp:${normalizedEmail}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	try {
		if (redisClient.isOpen) {
			await redisClient.set(otpKey, otpValue, {
				expiration: {
					type: "EX",
					value: expirationSeconds,
				},
			});
		}
	} catch (_err) {
		// Log redis warning silently
	}

	// 4. Send Admin Activation Email
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-activation-email.ejs",
	);

	const templateData = {
		name: createdAdmin.name,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: normalizedEmail,
		subject: "CityCare Admin Account Activation",
		html,
	});

	return createdAdmin;
};

const activateAdmin = async (payload: IActivateAdminPayload) => {
	const normalizedEmail = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});

	if (!user || user.role !== Role.ADMIN) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin user account not found");
	}

	if (
		user.status === UserStatus.BLOCKED ||
		user.status === UserStatus.DELETED ||
		user.isDeleted
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Admin account is blocked or deleted",
		);
	}

	if (user.emailVerified && user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Admin account is already activated. Please log in directly.",
		);
	}

	const otpKey = `admin-activation-otp:${normalizedEmail}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid or expired activation OTP",
		);
	}

	if (redisOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Activation OTP does not match");
	}

	const hashedPassword = await bcrypt.hash(payload.password, 8);

	const updatedAdmin = await prisma.user.update({
		where: { id: user.id },
		data: {
			password: hashedPassword,
			emailVerified: true,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			emailVerified: true,
		},
	});

	await redisClient.del(otpKey);

	await AuditLogService.createAuditLog({
		actorId: user.id,
		action: AuditAction.STATUS_CHANGE,
		entityType: AuditEntity.USER,
		entityId: user.id,
		newValue: { status: "ACTIVATED", emailVerified: true },
	});

	return updatedAdmin;
};

const getAllAdmins = async (
	filters: IAdminFilterOptions,
	options: IPaginationOptions,
) => {
	const page = Number(options.page) > 0 ? Number(options.page) : 1;
	const limit = Number(options.limit) > 0 ? Number(options.limit) : 10;
	const skip = (page - 1) * limit;

	const whereConditions: Prisma.UserWhereInput = {
		role: Role.ADMIN,
		isDeleted: false,
		...(filters.status ? { status: filters.status } : {}),
		...(filters.searchTerm
			? {
					OR: [
						{ name: { contains: filters.searchTerm, mode: "insensitive" } },
						{ email: { contains: filters.searchTerm, mode: "insensitive" } },
					],
				}
			: {}),
	};

	const [total, data] = await Promise.all([
		prisma.user.count({ where: whereConditions }),
		prisma.user.findMany({
			where: whereConditions,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	const totalPages = Math.ceil(total / limit);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages,
		},
		data,
	};
};

const getAdminById = async (id: string) => {
	const admin = await prisma.user.findFirst({
		where: {
			id,
			role: Role.ADMIN,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			emailVerified: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!admin) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin user not found");
	}

	return admin;
};

const updateAdmin = async (
	id: string,
	payload: IUpdateAdminPayload,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const admin = await prisma.user.findFirst({
		where: {
			id,
			role: Role.ADMIN,
			isDeleted: false,
		},
	});

	if (!admin) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin user not found");
	}

	const updated = await prisma.user.update({
		where: { id },
		data: {
			...(payload.name ? { name: payload.name.trim() } : {}),
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			emailVerified: true,
		},
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.UPDATE,
		entityType: AuditEntity.USER,
		entityId: id,
		oldValue: { name: admin.name },
		newValue: { name: updated.name },
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return updated;
};

const activateAdminStatus = async (
	id: string,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const admin = await prisma.user.findFirst({
		where: {
			id,
			role: Role.ADMIN,
			isDeleted: false,
		},
	});

	if (!admin) {
		throw new AppError(httpStatus.NOT_FOUND, "Admin user not found");
	}

	const updated = await prisma.user.update({
		where: { id },
		data: { status: UserStatus.ACTIVE },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
		},
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.STATUS_CHANGE,
		entityType: AuditEntity.USER,
		entityId: id,
		oldValue: { status: admin.status },
		newValue: { status: UserStatus.ACTIVE },
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return updated;
};

const deactivateAdminStatus = async (
	id: string,
	authUserId?: string,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const userToDeactivate = await prisma.user.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!userToDeactivate) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	// Safety Rule: ADMIN cannot deactivate a SUPER_ADMIN
	const actor = authUserId
		? await prisma.user.findUnique({ where: { id: authUserId } })
		: null;

	if (
		userToDeactivate.role === Role.SUPER_ADMIN &&
		actor?.role !== Role.SUPER_ADMIN
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden: Admin cannot deactivate a Super Admin account",
		);
	}

	// Safety Rule #10: Check if attempting to deactivate the last remaining SUPER_ADMIN
	if (userToDeactivate.role === Role.SUPER_ADMIN) {
		const activeSuperAdminCount = await prisma.user.count({
			where: {
				role: Role.SUPER_ADMIN,
				status: UserStatus.ACTIVE,
				isDeleted: false,
			},
		});

		if (activeSuperAdminCount <= 1) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Cannot deactivate the last remaining active Super Admin account",
			);
		}
	}

	const updated = await prisma.user.update({
		where: { id },
		data: { status: UserStatus.INACTIVE },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
		},
	});

	await AuditLogService.createAuditLog({
		actorId: authUserId || null,
		action: AuditAction.STATUS_CHANGE,
		entityType: AuditEntity.USER,
		entityId: id,
		oldValue: { status: userToDeactivate.status },
		newValue: { status: UserStatus.INACTIVE },
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	return updated;
};

export const AdminService = {
	createAdmin,
	activateAdmin,
	getAllAdmins,
	getAdminById,
	updateAdmin,
	activateAdminStatus,
	deactivateAdminStatus,
};
