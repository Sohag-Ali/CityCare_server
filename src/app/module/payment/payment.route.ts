import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

// Initiate Payment (CITIZEN only)
router.post(
	"/initiate",
	auth(Role.CITIZEN),
	validateRequest(PaymentValidation.initiatePaymentValidationSchema),
	PaymentController.initiatePayment,
);

// bKash Callback Endpoint (Public for gateway redirect)
router.get("/bkash/callback", PaymentController.handleBkashCallback);

// Citizen's own payments list
router.get("/my", auth(Role.CITIZEN), PaymentController.getMyPayments);

// Get Payment Details by ID
router.get(
	"/:id",
	auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
	PaymentController.getPaymentById,
);

export const PaymentRoutes = router;
