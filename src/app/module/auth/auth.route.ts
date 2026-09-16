import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(AuthValidation.citizenRegisterSchema),
	AuthController.registerCitizen,
);

router.post(
	"/verify-email",
	validateRequest(AuthValidation.CitizenEmailVerifyZodSchema),
	AuthController.verifyCitizenEmail,
);

router.post(
	"/login",
	validateRequest(AuthValidation.loginSchema),
	AuthController.loginUser,
);
router.get(
	"/me",
	auth(Role.ADMIN, Role.CITIZEN, Role.STAFF, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post(
	"/google-login",
	validateRequest(AuthValidation.googleLoginSchema),
	AuthController.googleLogin,
);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
	"/forgot-password",
	validateRequest(AuthValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);
router.post(
	"/reset-password",
	validateRequest(AuthValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);

router.post(
	"/staff/activate",
	validateRequest(AuthValidation.StaffActivationZodSchema),
	AuthController.activateStaff,
);

export const AuthRoutes = router;
