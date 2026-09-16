import type { EvidenceType } from "../../../generated/prisma/client";

export interface IUploadAttachmentPayload {
	attachmentType?: EvidenceType;
}

export interface IAttachmentFilterOptions {
	attachmentType?: EvidenceType;
}

export interface IAttachmentResponse {
	id: string;
	requestId: string;
	fileUrl: string;
	filePublicId: string | null;
	fileName: string | null;
	fileType: string | null;
	fileSize: number | null;
	evidenceType: EvidenceType | null;
	uploadedById: string | null;
	createdAt: Date;
}
