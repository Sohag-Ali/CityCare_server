import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
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
	ICreateStaffPayload,
	IPaginationOptions,
	IStaffFilterOptions,
	IUpdateStaffPayload,
} from "./staff.interface";

const createStaff = async (
	payload: ICreateStaffPayload,
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

	const normalizedEmployeeId = payload.employeeId.trim().toUpperCase();

	// 2. Verify employeeId uniqueness
	const existingEmployee = await prisma.staffProfile.findUnique({
		where: { employeeId: normalizedEmployeeId },
	});

	if (existingEmployee) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Staff with employee ID '${normalizedEmployeeId}' already exists`,
		);
	}

	// 3. Verify department exists and is active
	const department = await prisma.department.findFirst({
		where: {
			id: payload.departmentId,
			isDeleted: false,
		},
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	if (!department.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot create staff under an inactive department",
		);
	}

	// 4. Atomic creation in transaction
	const createdStaffProfile = await prisma.$transaction(async (tx) => {
		const createdUser = await tx.user.create({
			data: {
				name: payload.name.trim(),
				email: normalizedEmail,
				password: null, // Password set upon activation
				role: Role.STAFF, // Force role to STAFF
				status: UserStatus.ACTIVE,
				emailVerified: false, // Pending staff activation
			},
		});

		const staffProfile = await tx.staffProfile.create({
			data: {
				userId: createdUser.id,
				employeeId: normalizedEmployeeId,
				departmentId: payload.departmentId,
				staffType: payload.staffType,
				designation: payload.designation.trim(),
				joiningDate: new Date(payload.joiningDate),
				contactNumber: payload.contactNumber,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						status: true,
						imageUrl: true,
					},
				},
				department: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		await AuditLogService.createAuditLog(
			{
				actorId: authUserId || null,
				action: AuditAction.CREATE,
				entityType: AuditEntity.STAFF,
				entityId: staffProfile.id,
				newValue: {
					employeeId: staffProfile.employeeId,
					departmentId: staffProfile.departmentId,
					staffType: staffProfile.staffType,
					email: normalizedEmail,
				},
				ipAddress: clientInfo?.ipAddress,
				userAgent: clientInfo?.userAgent,
			},
			tx,
		);

		return staffProfile;
	});

	// 5. Generate 6-digit Activation OTP and store in Redis
	const expirationSeconds = 5 * 60;
	const otpKey = `staff-activation-otp:${normalizedEmail}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	// 6. Send Activation Email
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/staff-activation-email.ejs",
	);

	const templateData = {
		name: createdStaffProfile.user.name,
		employeeId: normalizedEmployeeId,
		departmentName: department.name,
		designation: payload.designation.trim(),
		staffType: payload.staffType,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	try {
		const html = await ejs.renderFile(templatePath, templateData);
		await transporter.sendMail({
			from: config.email_sender,
			to: normalizedEmail,
			subject: "CityCare Staff Account Activation",
			html,
		});
	} catch (emailError) {
		console.log("Staff activation email failed to send:", emailError);
	}

	return createdStaffProfile;
};

const getAllStaff = async (
	filters: IStaffFilterOptions,
	options: IPaginationOptions,
) => {
	const {
		page = 1,
		limit = 10,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const { departmentId, staffType, isActive, searchTerm } = filters;

	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const andConditions: any[] = [{ isDeleted: false }];

	if (departmentId) {
		andConditions.push({ departmentId });
	}

	if (staffType) {
		andConditions.push({ staffType });
	}

	if (isActive !== undefined) {
		andConditions.push({
			isActive: isActive === "true",
		});
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ employeeId: { contains: searchTerm, mode: "insensitive" } },
				{ designation: { contains: searchTerm, mode: "insensitive" } },
				{
					user: {
						name: { contains: searchTerm, mode: "insensitive" },
					},
				},
				{
					user: {
						email: { contains: searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	const whereConditions =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.staffProfile.findMany({
		where: whereConditions,
		skip,
		take,
		orderBy: {
			[sortBy]: sortOrder,
		},
		select: {
			id: true,
			userId: true,
			employeeId: true,
			departmentId: true,
			staffType: true,
			designation: true,
			joiningDate: true,
			contactNumber: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					status: true,
					imageUrl: true,
				},
			},
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	});

	const total = await prisma.staffProfile.count({
		where: whereConditions,
	});

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

const getStaffById = async (id: string) => {
	let staff = await prisma.staffProfile.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		select: {
			id: true,
			userId: true,
			employeeId: true,
			departmentId: true,
			staffType: true,
			designation: true,
			joiningDate: true,
			contactNumber: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					status: true,
					imageUrl: true,
				},
			},
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	});

	if (!staff) {
		// Try lookup by userId if id passed is userId
		staff = await prisma.staffProfile.findFirst({
			where: {
				userId: id,
				isDeleted: false,
			},
			select: {
				id: true,
				userId: true,
				employeeId: true,
				departmentId: true,
				staffType: true,
				designation: true,
				joiningDate: true,
				contactNumber: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						status: true,
						imageUrl: true,
					},
				},
				department: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});
	}

	if (!staff) {
		throw new AppError(httpStatus.NOT_FOUND, "Staff profile not found");
	}

	return staff;
};

const updateStaff = async (id: string, payload: IUpdateStaffPayload) => {
	const existingStaff = await prisma.staffProfile.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingStaff) {
		throw new AppError(httpStatus.NOT_FOUND, "Staff profile not found");
	}

	if (!existingStaff.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update an inactive staff profile",
		);
	}

	const staffUpdateData: Record<string, any> = {};

	if (payload.designation !== undefined) {
		staffUpdateData.designation = payload.designation.trim();
	}

	if (payload.contactNumber !== undefined) {
		staffUpdateData.contactNumber = payload.contactNumber;
	}

	if (payload.joiningDate !== undefined) {
		staffUpdateData.joiningDate = new Date(payload.joiningDate);
	}

	if (payload.staffType !== undefined) {
		staffUpdateData.staffType = payload.staffType;
	}

	if (payload.departmentId) {
		const department = await prisma.department.findFirst({
			where: {
				id: payload.departmentId,
				isDeleted: false,
			},
		});

		if (!department) {
			throw new AppError(httpStatus.NOT_FOUND, "Department not found");
		}

		if (!department.isActive) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Cannot assign staff to an inactive department",
			);
		}

		staffUpdateData.departmentId = payload.departmentId;
	}

	if (payload.employeeId) {
		const normalizedEmployeeId = payload.employeeId.trim().toUpperCase();

		const duplicateEmployee = await prisma.staffProfile.findFirst({
			where: {
				employeeId: normalizedEmployeeId,
				isDeleted: false,
				NOT: {
					id,
				},
			},
		});

		if (duplicateEmployee) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Staff with employee ID '${normalizedEmployeeId}' already exists`,
			);
		}

		staffUpdateData.employeeId = normalizedEmployeeId;
	}

	const result = await prisma.$transaction(async (tx) => {
		if (payload.name) {
			await tx.user.update({
				where: { id: existingStaff.userId },
				data: { name: payload.name.trim() },
			});
		}

		const updatedStaff = await tx.staffProfile.update({
			where: { id },
			data: staffUpdateData,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						status: true,
						imageUrl: true,
					},
				},
				department: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
			},
		});

		return updatedStaff;
	});

	return result;
};

const deleteStaff = async (id: string) => {
	const existingStaff = await prisma.staffProfile.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!existingStaff) {
		throw new AppError(httpStatus.NOT_FOUND, "Staff profile not found");
	}

	if (!existingStaff.isActive) {
		throw new AppError(httpStatus.BAD_REQUEST, "Staff is already inactive");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedStaff = await tx.staffProfile.update({
			where: { id },
			data: {
				isActive: false,
			},
		});

		await tx.user.update({
			where: { id: existingStaff.userId },
			data: { status: UserStatus.INACTIVE },
		});

		return updatedStaff;
	});

	return result;
};

export const StaffService = {
	createStaff,
	getAllStaff,
	getStaffById,
	updateStaff,
	deleteStaff,
};
