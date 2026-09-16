import type {
	AuditAction,
	AuditEntity,
} from "../../../generated/prisma/client";

export interface ICreateAuditLogPayload {
	actorId?: string | null;
	action: AuditAction;
	entityType: AuditEntity;
	entityId?: string | null;
	oldValue?: Record<string, any> | null;
	newValue?: Record<string, any> | null;
	ipAddress?: string | null;
	userAgent?: string | null;
}

export interface IAuditLogFilterOptions {
	action?: AuditAction;
	entityType?: AuditEntity;
	actorId?: string;
	entityId?: string;
	startDate?: string;
	endDate?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
