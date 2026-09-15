import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { DepartmentController } from "./department.controller";
import { DepartmentValidation } from "./department.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(DepartmentValidation.createDepartmentSchema),
	DepartmentController.createDepartment,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	DepartmentController.getAllDepartments,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	DepartmentController.getDepartmentById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(DepartmentValidation.updateDepartmentSchema),
	DepartmentController.updateDepartment,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	DepartmentController.deleteDepartment,
);

export const DepartmentRoutes = router;
