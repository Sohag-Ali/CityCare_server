import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import {
	AuditAction,
	AuditEntity,
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/client";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import { AuditLogService } from "../auditLog/auditLog.service";
import type {
	IActivateStaffPayload,
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterCitizenPayload,
	IRequestUser,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

const registerCitizen = async (payload: IRegisterCitizenPayload) => {
	const { name, password, citizen: citizenData } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const expirationSeconds = 5 * 60;

	const otpKey = `citizen-registration-otp:${email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const citizenRegistrationKey = `citizen-registration-data:${email}`;
	const redisUserDataPayload = {
		name,
		email,
		password: hashedPassword,
		citizen: citizenData,
	};

	await redisClient.set(
		citizenRegistrationKey,
		JSON.stringify(redisUserDataPayload),
		{
			expiration: {
				type: "EX",
				value: expirationSeconds,
			},
		},
	);

	const tempatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		name,
		email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(tempatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Email Verification",
		html,
	});
};

const verifyCitizenEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}

	if (isUserExist?.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Email ALready Verified");
	}

	if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	const otpKey = `citizen-registration-otp:${email}`;

	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	await redisClient.del(otpKey);

	const citizenRegistrationKey = `citizen-registration-data:${email}`;

	const redisCitizenData = await redisClient.get(citizenRegistrationKey);

	if (!redisCitizenData) {
		throw new AppError(httpStatus.NOT_FOUND, "Citizen Doesnt Exist");
	}

	const citizenPayload: IRegisterCitizenPayload = JSON.parse(redisCitizenData);

	const createdUser = await prisma.user.create({
		data: {
			name: citizenPayload.name,
			email: citizenPayload.email,
			password: citizenPayload.password,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			citizen: {
				create: {
					contactNumber: citizenPayload?.citizen?.contactNumber,
					address: citizenPayload?.citizen?.address,
					gender: citizenPayload?.citizen?.gender,
					age: citizenPayload?.citizen?.age,
					region: citizenPayload?.citizen?.region,
					permanentAddress: citizenPayload?.citizen?.permanentAddress,
				},
			},
		},
		include: { citizen: true },
	});

	await redisClient.del(citizenRegistrationKey);

	const tempatePath = path.join(
		process.cwd(),
		"src/app/templates/citizen-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(tempatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome to CityCare",
		html,
	});

	const { password, citizen, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
		user,
		citizen,
	};
};

const loginUser = async (
	payload: ILoginUserPayload,
	clientInfo?: { ipAddress?: string | null; userAgent?: string | null },
) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		await AuditLogService.createAuditLog({
			action: AuditAction.LOGIN_FAILED,
			entityType: AuditEntity.USER,
			newValue: { email },
			ipAddress: clientInfo?.ipAddress,
			userAgent: clientInfo?.userAgent,
		});
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		await AuditLogService.createAuditLog({
			actorId: user.id,
			action: AuditAction.LOGIN_FAILED,
			entityType: AuditEntity.USER,
			entityId: user.id,
			newValue: { email, reason: "BLOCKED" },
			ipAddress: clientInfo?.ipAddress,
			userAgent: clientInfo?.userAgent,
		});
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		await AuditLogService.createAuditLog({
			actorId: user.id,
			action: AuditAction.LOGIN_FAILED,
			entityType: AuditEntity.USER,
			entityId: user.id,
			newValue: { email, reason: "DELETED" },
			ipAddress: clientInfo?.ipAddress,
			userAgent: clientInfo?.userAgent,
		});
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		await AuditLogService.createAuditLog({
			actorId: user.id,
			action: AuditAction.LOGIN_FAILED,
			entityType: AuditEntity.USER,
			entityId: user.id,
			newValue: { email, reason: "INVALID_PASSWORD" },
			ipAddress: clientInfo?.ipAddress,
			userAgent: clientInfo?.userAgent,
		});
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	await AuditLogService.createAuditLog({
		actorId: user.id,
		action: AuditAction.LOGIN,
		entityType: AuditEntity.USER,
		entityId: user.id,
		newValue: { email, role: user.role },
		ipAddress: clientInfo?.ipAddress,
		userAgent: clientInfo?.userAgent,
	});

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			citizen: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User is inactive or not found",
		);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google ID Token Verification Failed", error);
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid Or Expired Google Id Token",
		);
	}

	if (!googleIdTokenPayload) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid Or Expired Google Id Token",
		);
	}

	if (!googleIdTokenPayload.email) {
		throw new AppError(httpStatus.BAD_REQUEST, "Google Email Not Found");
	}
	if (!googleIdTokenPayload.name) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Google Email User Name Not Found",
		);
	}

	const ifCitizenExistWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.CITIZEN,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = ifCitizenExistWithGoogleAuth;

	if (!ifCitizenExistWithGoogleAuth) {
		const ifCitizenExistWithCredentials = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.CITIZEN,
				authProvider: AuthProvider.CREDENTIAL,
			},
		});

		if (ifCitizenExistWithCredentials) {
			if (!ifCitizenExistWithCredentials.emailVerified) {
				throw new AppError(httpStatus.BAD_REQUEST, "Email Not Verified");
			}

			if (ifCitizenExistWithCredentials.status === UserStatus.BLOCKED) {
				throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
			}

			if (
				ifCitizenExistWithCredentials.isDeleted ||
				ifCitizenExistWithCredentials.status === UserStatus.DELETED
			) {
				throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
			}

			user = await prisma.user.update({
				where: {
					id: ifCitizenExistWithCredentials.id,
				},

				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			// Google Register
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					role: Role.CITIZEN,
					googleId: googleIdTokenPayload.sub,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					citizen: {
						create: {},
					},
				},
			});
		}
	}

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User Is Blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const { email } = payload;

	const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist!");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User Not Verified");
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Has Account With Google",
		);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();

	const key = `forgor-password-otp:${isUserExist.email}`;

	const expirationSeconds = 5 * 60;

	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const tempatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const templateData = {
		name: isUserExist.name,
		otp,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(tempatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Forgot Password",
		html,
	});
};

const activateStaff = async (payload: IActivateStaffPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
		include: { staffProfile: true },
	});

	if (!user || user.role !== Role.STAFF) {
		throw new AppError(httpStatus.NOT_FOUND, "Staff user account not found");
	}

	if (
		user.status === UserStatus.BLOCKED ||
		user.status === UserStatus.DELETED ||
		user.isDeleted
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Staff account is blocked or deleted",
		);
	}

	if (user.emailVerified && user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Staff account is already activated. Please use login or forgot password.",
		);
	}

	const otpKey = `staff-activation-otp:${email}`;
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

	const hashedPassword = await bcrypt.hash(
		payload.password,
		Number(config.bcrypt_salt_rounds) || 8,
	);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			password: hashedPassword,
			emailVerified: true,
			status: UserStatus.ACTIVE,
		},
	});

	await redisClient.del([otpKey]);

	return {
		message: "Staff account activated successfully. You can now log in.",
		email: user.email,
	};
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;

	const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist!");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User Not Verified");
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Has Account With Google",
		);
	}

	const key = `forgor-password-otp:${isUserExist.email}`;

	const redisOtp = await redisClient.get(key);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			password: hashedNewPassword,
		},
	});

	await redisClient.del([key]);

	const tempatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password-success.ejs",
	);

	const templateData = {
		name: isUserExist.name,
	};

	const html = await ejs.renderFile(tempatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Password Changed",
		html,
	});
};

export const AuthService = {
	registerCitizen,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	verifyCitizenEmail,
	activateStaff,
};
