import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { StaffController } from "../staff/staff.controller";
import { StaffValidation } from "../staff/staff.validation";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

// --- Admin Management (SUPER_ADMIN ONLY) ---
router.post(
	"/admins",
	auth(Role.SUPER_ADMIN),
	validateRequest(AdminValidation.createAdminSchema),
	AdminController.createAdmin,
);

router.get("/admins", auth(Role.SUPER_ADMIN), AdminController.getAllAdmins);

router.get("/admins/:id", auth(Role.SUPER_ADMIN), AdminController.getAdminById);

router.patch(
	"/admins/:id",
	auth(Role.SUPER_ADMIN),
	validateRequest(AdminValidation.updateAdminSchema),
	AdminController.updateAdmin,
);

router.patch(
	"/admins/:id/activate",
	auth(Role.SUPER_ADMIN),
	AdminController.activateAdminStatus,
);

router.patch(
	"/admins/:id/deactivate",
	auth(Role.SUPER_ADMIN),
	AdminController.deactivateAdminStatus,
);

// --- Staff Creation Alias (ADMIN ONLY) ---
router.post(
	"/staff",
	auth(Role.ADMIN),
	validateRequest(StaffValidation.createStaffSchema),
	StaffController.createStaff,
);

export const AdminRoutes = router;
