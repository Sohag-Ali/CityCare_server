import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { AssignmentController } from "../assignment/assignment.controller";
import { StaffController } from "./staff.controller";
import { StaffValidation } from "./staff.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StaffValidation.createStaffSchema),
	StaffController.createStaff,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StaffController.getAllStaff,
);

router.get(
	"/technicians",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF),
	AssignmentController.getEligibleTechnicians,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StaffController.getStaffById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(StaffValidation.updateStaffSchema),
	StaffController.updateStaff,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	StaffController.deleteStaff,
);

export const StaffRoutes = router;
