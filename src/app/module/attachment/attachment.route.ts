import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validationRequest";
import { AttachmentController } from "./attachment.controller";
import { AttachmentValidation } from "./attachment.validation";

const router = Router();

router.post(
	"/:id/attachments",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	upload.array("files", 5),
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

export const AttachmentRoutes = router;
