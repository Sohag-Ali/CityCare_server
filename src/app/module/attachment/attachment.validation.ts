import { z } from "zod";
import { EvidenceType } from "../../../generated/prisma/client";

const uploadAttachmentZodSchema = z.object({
	attachmentType: z
		.nativeEnum(EvidenceType, {
			message:
				"Invalid attachment type. Must be one of: COMPLAINT, BEFORE, PROGRESS, AFTER, RESOLUTION, OTHER",
		})
		.optional(),
});

export const AttachmentValidation = {
	uploadAttachmentZodSchema,
};
