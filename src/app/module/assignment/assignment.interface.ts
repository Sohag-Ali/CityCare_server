import type { AssignmentStatus } from "../../../generated/prisma/client";

export interface IAssignTechnicianPayload {
	technicianId: string;
	note?: string;
}

export interface IAcceptAssignmentPayload {
	note?: string;
}

export interface IAssignmentFilterOptions {
	status?: AssignmentStatus;
	searchTerm?: string;
}

export interface IEligibleTechnicianFilterOptions {
	departmentId?: string;
	isActive?: boolean;
	searchTerm?: string;
}
