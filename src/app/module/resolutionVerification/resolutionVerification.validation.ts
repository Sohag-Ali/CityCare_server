import { z } from "zod";
import { VerificationDecision } from "../../../generated/prisma/client";

const verifyResolutionZodSchema = z
	.object({
		decision: z.nativeEnum(VerificationDecision, {
			message:
				"Invalid verification decision. Must be APPROVED or REWORK_REQUIRED",
		}),
		comments: z
			.string()
			.trim()
			.max(1000, "Comments cannot exceed 1000 characters")
			.optional(),
		qualityRating: z.number().int().min(1).max(5).optional(),
	})
	.refine(
		(data) => {
			if (data.decision === VerificationDecision.REWORK_REQUIRED) {
				return (
					typeof data.comments === "string" && data.comments.trim().length > 0
				);
			}
			return true;
		},
		{
			message: "Comments are mandatory when decision is REWORK_REQUIRED",
			path: ["comments"],
		},
	);

export const ResolutionVerificationValidation = {
	verifyResolutionZodSchema,
};
