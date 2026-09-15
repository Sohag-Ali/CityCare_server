import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "./auth.interface";
import { AuthService } from "./auth.service";
import { AuthValidation } from "./auth.validation";

const registerCitizen = catchAsync(async (req: Request, res: Response) => {
	// const payload = PatientValidation.PatientRegistrationZodSchema.safeParse(req.body);

	// if(!payload.success){
	// 	console.log(payload.error);
	// 	console.log(payload.error.issues);

	// 	throw new Error(payload.error.issues[0].message)
	// }

	// console.log(payload);

	const payload = req.body;

	await AuthService.registerCitizen(payload);

	// const { accessToken, refreshToken, user, patient } = result;

	// res.cookie("accessToken", accessToken, {
	// 	httpOnly: true,
	// 	secure: false,
	// 	sameSite: "none",
	// 	maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	// });
	// res.cookie("refreshToken", refreshToken, {
	// 	httpOnly: true,
	// 	secure: false,
	// 	sameSite: "none",
	// 	maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	// });

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Verification OTP Sent",
		data: null,
	});
});

const verifyCitizenEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.verifyCitizenEmail(payload);

	const { accessToken, refreshToken, user, citizen } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Email Verified Successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			citizen,
		},
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = AuthValidation.loginSchema.safeParse(req.body);

	if (!payload.success) {
		let errorMessage = "";
		payload.error.issues.forEach((issue) => {
			errorMessage += issue.message;
		});
		throw new Error(errorMessage.slice(0, -2));
	}
	const result = await AuthService.loginUser(payload.data);
	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!user) {
		throw new Error("User information is missing in the request");
	}

	const result = await AuthService.getMe(user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	if (!req.cookies.refreshToken) {
		throw new Error("Refresh token is missing");
	}
	const result = await AuthService.refreshToken(req.cookies.refreshToken);
	const { accessToken, refreshToken: newRefreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", newRefreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: {
			accessToken,
			refreshToken: newRefreshToken,
		},
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const payload = AuthValidation.googleLoginSchema.safeParse(req.body);

	if (!payload.success) {
		let errorMessage = "";
		payload.error.issues.forEach((issue) => {
			errorMessage += issue.message;
		});
		throw new Error(errorMessage.slice(0, -2));
	}

	const result = await AuthService.googleLogin(payload.data);

	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Google login successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	await AuthService.forgotPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `OTP Sent To Email : ${payload.email}`,
		data: {
			email: payload.email,
		},
	});
});
const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = AuthValidation.ResetPasswordZodSchema.safeParse(req.body);

	if (!payload.success) {
		let errorMessage = "";
		payload.error.issues.forEach((issue) => {
			errorMessage += issue.message;
		});
		throw new Error(errorMessage.slice(0, -2));
	}

	await AuthService.resetPassword(payload.data);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password Changed Successfully",
		data: null,
	});
});

const activateStaff = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.activateStaff(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff account activated successfully",
		data: result,
	});
});

export const AuthController = {
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
