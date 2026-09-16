import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { SlaController } from "./sla.controller";
import { SlaValidation } from "./sla.validation";

const router = Router();

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	SlaController.getAllPolicies,
);

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SlaValidation.createSlaPolicyZodSchema),
	SlaController.createPolicy,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(SlaValidation.updateSlaPolicyZodSchema),
	SlaController.updatePolicy,
);

export const SlaRoutes = router;
