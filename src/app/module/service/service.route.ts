import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { ServiceController } from "./service.controller";
import { ServiceValidation } from "./service.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ServiceValidation.createServiceZodSchema),
	ServiceController.createService,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceController.getAllServices,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceController.getServiceById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ServiceValidation.updateServiceZodSchema),
	ServiceController.updateService,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ServiceController.deleteService,
);

export const ServiceRoutes = router;
