import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { WardController } from "./ward.controller";
import { WardValidation } from "./ward.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(WardValidation.createWardSchema),
	WardController.createWard,
);

router.get("/", auth(Role.ADMIN, Role.SUPER_ADMIN), WardController.getAllWards);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	WardController.getWardById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(WardValidation.updateWardSchema),
	WardController.updateWard,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	WardController.deleteWard,
);

export const WardRoutes = router;
