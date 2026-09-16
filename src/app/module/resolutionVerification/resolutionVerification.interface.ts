import type { VerificationDecision } from "../../../generated/prisma/client";

export interface IVerifyResolutionPayload {
	decision: VerificationDecision;
	comments?: string;
	qualityRating?: number;
}
