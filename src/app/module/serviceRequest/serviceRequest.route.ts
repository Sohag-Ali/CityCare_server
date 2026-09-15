import {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import { Role } from "../../../generated/prisma/client";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { ServiceRequestController } from "./serviceRequest.controller";
import { ServiceRequestValidation } from "./serviceRequest.validation";

const router = Router();

const parseMultipartJsonBody = (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	if (typeof req.body?.data === "string") {
		try {
			req.body = JSON.parse(req.body.data);
		} catch {
			// keep original body if parsing fails
		}
	}
	next();
};

router.post(
	"/",
	auth(Role.CITIZEN),
	upload.array("files", 5),
	parseMultipartJsonBody,
	validateRequest(ServiceRequestValidation.createServiceRequestZodSchema),
	ServiceRequestController.createServiceRequest,
);

router.get(
	"/my",
	auth(Role.CITIZEN),
	ServiceRequestController.getMyServiceRequests,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceRequestController.getAllServiceRequests,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceRequestController.getServiceRequestById,
);

router.patch(
	"/:id",
	auth(Role.CITIZEN),
	validateRequest(ServiceRequestValidation.updateServiceRequestZodSchema),
	ServiceRequestController.updateServiceRequest,
);

router.delete(
	"/:id",
	auth(Role.CITIZEN),
	ServiceRequestController.cancelServiceRequest,
);

export const ServiceRequestRoutes = router;
