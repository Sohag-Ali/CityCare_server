import {
	RequestStatus,
	Role,
	StaffType,
} from "../../../generated/prisma/client";

/**
 * State Transition Matrix for Service Request Lifecycle
 */
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
	[RequestStatus.SUBMITTED]: [
		RequestStatus.UNDER_REVIEW,
		RequestStatus.CANCELLED,
	],
	[RequestStatus.UNDER_REVIEW]: [
		RequestStatus.APPROVED,
		RequestStatus.REJECTED,
		RequestStatus.DUPLICATE,
		RequestStatus.ESCALATED,
	],
	[RequestStatus.APPROVED]: [RequestStatus.ASSIGNED, RequestStatus.ESCALATED],
	[RequestStatus.ASSIGNED]: [RequestStatus.ACCEPTED, RequestStatus.ESCALATED],
	[RequestStatus.ACCEPTED]: [
		RequestStatus.IN_PROGRESS,
		RequestStatus.ESCALATED,
	],
	[RequestStatus.IN_PROGRESS]: [
		RequestStatus.RESOLUTION_SUBMITTED,
		RequestStatus.ESCALATED,
	],
	[RequestStatus.RESOLUTION_SUBMITTED]: [RequestStatus.VERIFICATION],
	[RequestStatus.VERIFICATION]: [
		RequestStatus.RESOLVED,
		RequestStatus.IN_PROGRESS,
	],
	[RequestStatus.RESOLVED]: [RequestStatus.CLOSED],
	// Escalated requests can be reviewed, approved, or assigned upon resolution
	[RequestStatus.ESCALATED]: [
		RequestStatus.UNDER_REVIEW,
		RequestStatus.APPROVED,
		RequestStatus.ASSIGNED,
	],
	// Terminal States - No further transitions allowed
	[RequestStatus.CLOSED]: [],
	[RequestStatus.REJECTED]: [],
	[RequestStatus.CANCELLED]: [],
	[RequestStatus.DUPLICATE]: [],
};

/**
 * Check if a state transition from currentStatus to targetStatus is allowed by state machine rules
 */
export const isValidTransition = (
	currentStatus: RequestStatus,
	targetStatus: RequestStatus,
): boolean => {
	const validNextStates = ALLOWED_TRANSITIONS[currentStatus];
	if (!validNextStates) return false;
	return validNextStates.includes(targetStatus);
};

/**
 * Role and StaffType Permission Policy Matrix for State Transitions
 */
export const canRolePerformTransition = (
	userRole: Role,
	staffType: StaffType | null,
	isCitizenOwner: boolean,
	currentStatus: RequestStatus,
	targetStatus: RequestStatus,
): boolean => {
	// 1. ADMIN & SUPER_ADMIN can trigger any valid state machine transition
	if (userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN) {
		return isValidTransition(currentStatus, targetStatus);
	}

	// 2. CITIZEN can ONLY cancel their own requests in SUBMITTED or UNDER_REVIEW state
	if (userRole === Role.CITIZEN) {
		if (!isCitizenOwner) return false;
		if (targetStatus === RequestStatus.CANCELLED) {
			return (
				currentStatus === RequestStatus.SUBMITTED ||
				currentStatus === RequestStatus.UNDER_REVIEW
			);
		}
		return false;
	}

	// 3. STAFF Permissions based on StaffType (OFFICER, TECHNICIAN, MANAGER)
	if (userRole === Role.STAFF) {
		if (!isValidTransition(currentStatus, targetStatus)) {
			return false;
		}

		if (staffType === StaffType.OFFICER) {
			// Officer handles initial review and verification transitions
			return (
				targetStatus === RequestStatus.UNDER_REVIEW ||
				targetStatus === RequestStatus.APPROVED ||
				targetStatus === RequestStatus.REJECTED ||
				targetStatus === RequestStatus.DUPLICATE ||
				targetStatus === RequestStatus.VERIFICATION ||
				targetStatus === RequestStatus.ESCALATED
			);
		}

		if (staffType === StaffType.MANAGER) {
			// Manager handles review, assignment, verification, closing, escalation
			return (
				targetStatus === RequestStatus.UNDER_REVIEW ||
				targetStatus === RequestStatus.APPROVED ||
				targetStatus === RequestStatus.REJECTED ||
				targetStatus === RequestStatus.DUPLICATE ||
				targetStatus === RequestStatus.ESCALATED ||
				targetStatus === RequestStatus.ASSIGNED ||
				targetStatus === RequestStatus.VERIFICATION ||
				targetStatus === RequestStatus.RESOLVED ||
				targetStatus === RequestStatus.IN_PROGRESS || // Verification re-open
				targetStatus === RequestStatus.CLOSED
			);
		}

		if (staffType === StaffType.TECHNICIAN) {
			// Technician handles work execution transitions
			return (
				targetStatus === RequestStatus.ACCEPTED ||
				targetStatus === RequestStatus.IN_PROGRESS ||
				targetStatus === RequestStatus.RESOLUTION_SUBMITTED ||
				targetStatus === RequestStatus.ESCALATED
			);
		}
	}

	return false;
};
