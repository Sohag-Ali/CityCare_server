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
import { AssignmentController } from "../assignment/assignment.controller";
import { AssignmentValidation } from "../assignment/assignment.validation";
import { AttachmentController } from "../attachment/attachment.controller";
import { AttachmentValidation } from "../attachment/attachment.validation";
import { ResolutionVerificationController } from "../resolutionVerification/resolutionVerification.controller";
import { ResolutionVerificationValidation } from "../resolutionVerification/resolutionVerification.validation";
import { SlaController } from "../sla/sla.controller";
import { TechnicianWorkController } from "../technicianWork/technicianWork.controller";
import { TechnicianWorkValidation } from "../technicianWork/technicianWork.validation";
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
//Done
router.post(
	"/",
	auth(Role.CITIZEN),
	upload.array("files", 5),
	parseMultipartJsonBody,
	validateRequest(ServiceRequestValidation.createServiceRequestZodSchema),
	ServiceRequestController.createServiceRequest,
);
//Done
router.get(
	"/my",
	auth(Role.CITIZEN),
	ServiceRequestController.getMyServiceRequests,
);
//Done
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ServiceRequestController.getAllServiceRequests,
);

router.post(
	"/:id/assign",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF),
	validateRequest(AssignmentValidation.assignTechnicianZodSchema),
	AssignmentController.assignTechnician,
);

router.patch(
	"/:id/start",
	auth(Role.STAFF),
	TechnicianWorkController.startWork,
);

router.post(
	"/:id/updates",
	auth(Role.STAFF),
	upload.array("files", 5),
	parseMultipartJsonBody,
	validateRequest(TechnicianWorkValidation.createTechnicianUpdateZodSchema),
	TechnicianWorkController.createTechnicianUpdate,
);

router.get(
	"/:id/updates",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	TechnicianWorkController.getTechnicianUpdates,
);

router.post(
	"/:id/resolution",
	auth(Role.STAFF),
	upload.array("files", 5),
	parseMultipartJsonBody,
	validateRequest(TechnicianWorkValidation.submitResolutionZodSchema),
	TechnicianWorkController.submitResolution,
);

router.get(
	"/:id/resolution",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	TechnicianWorkController.getResolution,
);

router.post(
	"/:id/attachments",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	upload.array("files", 5),
	parseMultipartJsonBody,
	validateRequest(AttachmentValidation.uploadAttachmentZodSchema),
	AttachmentController.uploadAttachments,
);

router.get(
	"/:id/attachments",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	AttachmentController.getRequestAttachments,
);

router.delete(
	"/:id/attachments/:attachmentId",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	AttachmentController.deleteAttachment,
);

router.post(
	"/:id/evidence",
	auth(Role.STAFF),
	upload.array("files", 5),
	TechnicianWorkController.uploadEvidence,
);

router.post(
	"/:id/verify",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF),
	validateRequest(ResolutionVerificationValidation.verifyResolutionZodSchema),
	ResolutionVerificationController.verifyResolution,
);

router.get(
	"/:id/sla",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	SlaController.getRequestSlaStatus,
);
//Done
router.get(
	"/:id/history",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceRequestController.getServiceRequestHistory,
);
//Done
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF, Role.CITIZEN),
	ServiceRequestController.getServiceRequestById,
);
//Done
router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF),
	validateRequest(ServiceRequestValidation.updateServiceRequestStatusZodSchema),
	ServiceRequestController.updateServiceRequestStatus,
);
//Done
router.patch(
	"/:id",
	auth(Role.CITIZEN),
	validateRequest(ServiceRequestValidation.updateServiceRequestZodSchema),
	ServiceRequestController.updateServiceRequest,
);
//Done
router.delete(
	"/:id",
	auth(Role.CITIZEN),
	ServiceRequestController.cancelServiceRequest,
);

export const ServiceRequestRoutes = router;
