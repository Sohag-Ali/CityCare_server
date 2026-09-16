import { z } from "zod";
import { EvidenceType } from "../../../generated/prisma/client";

const createTechnicianUpdateZodSchema = z.object({
	message: z
		.string({ message: "Update message is required" })
		.trim()
		.min(1, "Update message cannot be empty"),
	progressPercentage: z
		.number({ message: "Progress percentage must be a number" })
		.int("Progress percentage must be an integer")
		.min(0, "Progress percentage cannot be less than 0")
		.max(100, "Progress percentage cannot be greater than 100")
		.optional(),
	evidenceType: z.nativeEnum(EvidenceType).optional(),
});

const submitResolutionZodSchema = z.object({
	summary: z
		.string({ message: "Resolution summary is required" })
		.trim()
		.min(1, "Resolution summary cannot be empty")
		.max(255, "Summary cannot exceed 255 characters"),
	details: z
		.string({ message: "Resolution details are required" })
		.trim()
		.min(1, "Resolution details cannot be empty"),
	evidenceType: z.nativeEnum(EvidenceType).optional(),
});

export const TechnicianWorkValidation = {
	createTechnicianUpdateZodSchema,
	submitResolutionZodSchema,
};
