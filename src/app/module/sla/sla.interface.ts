import type { ServicePriority } from "../../../generated/prisma/client";

export interface ICreateSlaPolicyPayload {
	priority: ServicePriority;
	responseTimeMinutes: number;
	resolutionTimeMinutes: number;
	isActive?: boolean;
}

export interface IUpdateSlaPolicyPayload {
	responseTimeMinutes?: number;
	resolutionTimeMinutes?: number;
	isActive?: boolean;
}

export type SlaStatusState = "ON_TRACK" | "WARNING" | "BREACHED" | "COMPLETED";

export interface IRequestSlaDetails {
	status: SlaStatusState;
	responseDueAt: Date | null;
	resolutionDueAt: Date | null;
	responseStartedAt: Date | null;
	responseCompletedAt: Date | null;
	resolutionStartedAt: Date | null;
	resolutionCompletedAt: Date | null;
	isResponseBreached: boolean;
	isResolutionBreached: boolean;
	isWarningTriggered: boolean;
	events: Array<unknown>;
	escalations: Array<unknown>;
}
