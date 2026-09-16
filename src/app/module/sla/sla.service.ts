import httpStatus from "http-status";
import {
	EscalationStatus,
	RequestStatus,
	Role,
	ServicePriority,
	SlaEventType,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateSlaPolicyPayload,
	IRequestSlaDetails,
	IUpdateSlaPolicyPayload,
	SlaStatusState,
} from "./sla.interface";

// Default SLA fallback mapping (in minutes) if database policy is not explicitly seeded
const DEFAULT_SLA_MAPPING: Record<
	ServicePriority,
	{ responseTimeMinutes: number; resolutionTimeMinutes: number }
> = {
	[ServicePriority.LOW]: {
		responseTimeMinutes: 1440,
		resolutionTimeMinutes: 10080,
	}, // 24h / 7 days
	[ServicePriority.MEDIUM]: {
		responseTimeMinutes: 240,
		resolutionTimeMinutes: 4320,
	}, // 4h / 72h
	[ServicePriority.HIGH]: {
		responseTimeMinutes: 60,
		resolutionTimeMinutes: 1440,
	}, // 1h / 24h
	[ServicePriority.URGENT]: {
		responseTimeMinutes: 30,
		resolutionTimeMinutes: 240,
	}, // 30m / 4h
};

/**
 * Calculates SLA response and resolution deadlines for a given request priority and start time.
 */
const getSlaPolicyForPriority = async (priority: ServicePriority) => {
	const policy = await prisma.slaPolicy.findFirst({
		where: { priority, isActive: true },
	});

	if (policy) {
		return {
			responseTimeMinutes: policy.responseTimeMinutes,
			resolutionTimeMinutes: policy.resolutionTimeMinutes,
		};
	}

	return (
		DEFAULT_SLA_MAPPING[priority] || DEFAULT_SLA_MAPPING[ServicePriority.MEDIUM]
	);
};

/**
 * Snapshot SLA calculated deadlines on a ServiceRequest record.
 */
const snapshotRequestSlaDeadlines = async (
	requestId: string,
	priority: ServicePriority,
	requestCreatedAt: Date = new Date(),
) => {
	const policy = await getSlaPolicyForPriority(priority);

	const responseDueAt = new Date(
		requestCreatedAt.getTime() + policy.responseTimeMinutes * 60 * 1000,
	);
	const resolutionDueAt = new Date(
		requestCreatedAt.getTime() + policy.resolutionTimeMinutes * 60 * 1000,
	);

	await prisma.serviceRequest.update({
		where: { id: requestId },
		data: {
			responseDueAt,
			resolutionDueAt,
			responseStartedAt: requestCreatedAt,
			resolutionStartedAt: requestCreatedAt,
		},
	});

	return { responseDueAt, resolutionDueAt };
};

/**
 * Idempotently records SLA events (WARNING, BREACH, ESCALATION).
 */
const recordSlaEvent = async (
	serviceRequestId: string,
	type: SlaEventType,
	metadata?: string,
) => {
	const existingEvent = await prisma.slaEvent.findFirst({
		where: { serviceRequestId, type },
	});

	if (existingEvent) {
		return existingEvent;
	}

	return prisma.slaEvent.create({
		data: {
			serviceRequestId,
			type,
			occurredAt: new Date(),
			metadata: metadata || null,
		},
	});
};

/**
 * Idempotently creates an Escalation record when SLA breach occurs.
 */
const createEscalationIfNeeded = async (
	serviceRequestId: string,
	reason = "SLA resolution deadline breached",
) => {
	const existingEscalation = await prisma.escalation.findFirst({
		where: { serviceRequestId, status: EscalationStatus.OPEN },
	});

	if (existingEscalation) {
		return existingEscalation;
	}

	const serviceRequest = await prisma.serviceRequest.findUnique({
		where: { id: serviceRequestId },
		include: {
			service: {
				include: {
					category: true,
				},
			},
		},
	});

	const departmentId = serviceRequest?.service.category.departmentId || null;

	const escalation = await prisma.escalation.create({
		data: {
			serviceRequestId,
			trigger: "SLA_BREACH",
			level: 1,
			escalatedToDepartmentId: departmentId,
			reason,
			status: EscalationStatus.OPEN,
		},
	});

	await recordSlaEvent(
		serviceRequestId,
		SlaEventType.ESCALATION,
		`Escalated to department ID ${departmentId}`,
	);

	return escalation;
};

/**
 * Reusable service function to calculate and check request SLA status.
 */
const checkSlaStatus = async (
	requestId: string,
	authUserId?: string,
	authRole?: Role,
): Promise<IRequestSlaDetails> => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: requestId, isDeleted: false },
		include: {
			service: {
				include: {
					category: {
						include: {
							department: true,
						},
					},
				},
			},
			slaEvents: {
				orderBy: { createdAt: "asc" },
			},
			escalations: {
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!serviceRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	// Access Control
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (!citizen || serviceRequest.citizenId !== citizen.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view SLA info for another citizen's request",
			);
		}
	} else if (authRole === Role.STAFF) {
		const staff = await prisma.staffProfile.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (
			!staff ||
			serviceRequest.service.category.department.id !== staff.departmentId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view SLA info outside your department",
			);
		}
	}

	const now = new Date();
	const responseCompleted =
		serviceRequest.responseCompletedAt !== null ||
		serviceRequest.status !== RequestStatus.SUBMITTED;

	const resolutionCompleted =
		serviceRequest.resolutionCompletedAt !== null ||
		serviceRequest.status === RequestStatus.RESOLVED ||
		serviceRequest.status === RequestStatus.CLOSED;

	// Determine breaches
	const isResponseBreached = Boolean(
		!responseCompleted &&
			serviceRequest.responseDueAt &&
			now > serviceRequest.responseDueAt,
	);

	const isResolutionBreached = Boolean(
		!resolutionCompleted &&
			serviceRequest.resolutionDueAt &&
			now > serviceRequest.resolutionDueAt,
	);

	// Determine warning (within 20% remaining window before resolution deadline)
	let isWarningTriggered = false;
	if (
		!resolutionCompleted &&
		!isResolutionBreached &&
		serviceRequest.resolutionDueAt &&
		serviceRequest.resolutionStartedAt
	) {
		const totalWindow =
			serviceRequest.resolutionDueAt.getTime() -
			serviceRequest.resolutionStartedAt.getTime();
		const remaining = serviceRequest.resolutionDueAt.getTime() - now.getTime();
		if (totalWindow > 0 && remaining / totalWindow <= 0.2) {
			isWarningTriggered = true;
		}
	}

	// Dynamic Status
	let status: SlaStatusState = "ON_TRACK";
	if (resolutionCompleted) {
		status = "COMPLETED";
	} else if (isResponseBreached || isResolutionBreached) {
		status = "BREACHED";
		// Idempotent breach event & escalation
		await recordSlaEvent(requestId, SlaEventType.BREACH, "Deadline breached");
		await createEscalationIfNeeded(requestId);
	} else if (isWarningTriggered) {
		status = "WARNING";
		await recordSlaEvent(
			requestId,
			SlaEventType.WARNING,
			"Approaching resolution deadline",
		);
	}

	// Refetch latest events and escalations after potential auto-creation
	const updatedEvents = await prisma.slaEvent.findMany({
		where: { serviceRequestId: requestId },
		orderBy: { createdAt: "asc" },
	});
	const updatedEscalations = await prisma.escalation.findMany({
		where: { serviceRequestId: requestId },
		orderBy: { createdAt: "asc" },
	});

	return {
		status,
		responseDueAt: serviceRequest.responseDueAt,
		resolutionDueAt: serviceRequest.resolutionDueAt,
		responseStartedAt: serviceRequest.responseStartedAt,
		responseCompletedAt: serviceRequest.responseCompletedAt,
		resolutionStartedAt: serviceRequest.resolutionStartedAt,
		resolutionCompletedAt: serviceRequest.resolutionCompletedAt,
		isResponseBreached,
		isResolutionBreached,
		isWarningTriggered,
		events: updatedEvents,
		escalations: updatedEscalations,
	};
};

// Admin SLA Policy CRUD
const getAllPolicies = async () => {
	const policies = await prisma.slaPolicy.findMany({
		orderBy: { priority: "asc" },
	});
	return policies;
};

const createPolicy = async (
	authRole: Role,
	payload: ICreateSlaPolicyPayload,
) => {
	if (authRole !== Role.ADMIN && authRole !== Role.SUPER_ADMIN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only administrators can create SLA policies",
		);
	}

	const existing = await prisma.slaPolicy.findUnique({
		where: { priority: payload.priority },
	});

	if (existing) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`SLA policy for priority ${payload.priority} already exists. Update the existing policy instead.`,
		);
	}

	const policy = await prisma.slaPolicy.create({
		data: {
			priority: payload.priority,
			responseTimeMinutes: payload.responseTimeMinutes,
			resolutionTimeMinutes: payload.resolutionTimeMinutes,
			isActive: payload.isActive ?? true,
		},
	});

	return policy;
};

const updatePolicy = async (
	id: string,
	authRole: Role,
	payload: IUpdateSlaPolicyPayload,
) => {
	if (authRole !== Role.ADMIN && authRole !== Role.SUPER_ADMIN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only administrators can update SLA policies",
		);
	}

	const existing = await prisma.slaPolicy.findUnique({
		where: { id },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "SLA policy not found");
	}

	const updated = await prisma.slaPolicy.update({
		where: { id },
		data: {
			responseTimeMinutes: payload.responseTimeMinutes,
			resolutionTimeMinutes: payload.resolutionTimeMinutes,
			isActive: payload.isActive,
		},
	});

	return updated;
};

export const SlaService = {
	getSlaPolicyForPriority,
	snapshotRequestSlaDeadlines,
	recordSlaEvent,
	createEscalationIfNeeded,
	checkSlaStatus,
	getAllPolicies,
	createPolicy,
	updatePolicy,
};
