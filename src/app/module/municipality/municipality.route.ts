import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { MunicipalityController } from "./municipality.controller";
import { MunicipalityValidation } from "./municipality.validation";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(MunicipalityValidation.createMunicipalitySchema),
	MunicipalityController.createMunicipality,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MunicipalityController.getAllMunicipalities,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MunicipalityController.getMunicipalityById,
);

router.patch(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(MunicipalityValidation.updateMunicipalitySchema),
	MunicipalityController.updateMunicipality,
);

router.delete(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	MunicipalityController.deleteMunicipality,
);

export const MunicipalityRoutes = router;
