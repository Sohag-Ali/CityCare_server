import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { ZoneController } from "./zone.controller";
import { ZoneValidation } from "./zone.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ZoneValidation.createZoneSchema),
	ZoneController.createZone,
);

router.get("/", auth(Role.ADMIN, Role.SUPER_ADMIN), ZoneController.getAllZones);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ZoneController.getZoneById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ZoneValidation.updateZoneSchema),
	ZoneController.updateZone,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ZoneController.deleteZone,
);

export const ZoneRoutes = router;
