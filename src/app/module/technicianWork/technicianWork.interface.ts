import type { EvidenceType } from "../../../generated/prisma/client";

export interface ICreateTechnicianUpdatePayload {
	message: string;
	progressPercentage?: number;
	evidenceType?: EvidenceType;
}

export interface ISubmitResolutionPayload {
	summary: string;
	details: string;
	evidenceType?: EvidenceType;
}

export interface ITechnicianUpdateFilterOptions {
	page?: number;
	limit?: number;
}
