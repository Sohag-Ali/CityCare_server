import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { AssignmentController } from "./assignment.controller";
import { AssignmentValidation } from "./assignment.validation";

const router = Router();

router.get("/my", auth(Role.STAFF), AssignmentController.getMyAssignments);

router.patch(
	"/:id/accept",
	auth(Role.STAFF),
	validateRequest(AssignmentValidation.acceptAssignmentZodSchema),
	AssignmentController.acceptAssignment,
);

export const AssignmentRoutes = router;
