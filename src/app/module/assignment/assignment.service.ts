import httpStatus from "http-status";
import {
	AssignmentStatus,
	type Prisma,
	RequestStatus,
	Role,
	StaffType,
	UserStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { canRolePerformTransition } from "../serviceRequest/serviceRequest.stateMachine";
import type {
	IAcceptAssignmentPayload,
	IAssignmentFilterOptions,
	IAssignTechnicianPayload,
	IEligibleTechnicianFilterOptions,
} from "./assignment.interface";

const assignTechnician = async (
	requestId: string,
	authRole: Role,
	authUserId: string,
	payload: IAssignTechnicianPayload,
) => {
	// 1. Validate Assigner Authority
	if (authRole === Role.CITIZEN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Citizens are not allowed to assign technicians",
		);
	}

	let assignerDepartmentId: string | null = null;
	let assignerStaffType: StaffType | null = null;

	if (authRole === Role.STAFF) {
		const assignerStaff = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});

		if (!assignerStaff?.isActive || assignerStaff.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Assigner staff profile is inactive or not found",
			);
		}

		if (assignerStaff.staffType === StaffType.TECHNICIAN) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Technicians cannot assign work to themselves or others",
			);
		}

		assignerDepartmentId = assignerStaff.departmentId;
		assignerStaffType = assignerStaff.staffType;
	}

	// 2. Fetch Service Request and determine request department
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
		},
	});

	if (!serviceRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	const requestDepartmentId = serviceRequest.service.category.departmentId;

	// Department scoping check for STAFF assigners
	if (
		authRole === Role.STAFF &&
		assignerDepartmentId &&
		assignerDepartmentId !== requestDepartmentId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Staff members can only assign requests belonging to their own department",
		);
	}

	// 3. Request Status Validation
	if (
		serviceRequest.status !== RequestStatus.APPROVED &&
		serviceRequest.status !== RequestStatus.ASSIGNED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request in status ${serviceRequest.status} cannot be assigned. Request must be in APPROVED or ASSIGNED status.`,
		);
	}

	// State machine permission check
	const canPerform = canRolePerformTransition(
		authRole,
		assignerStaffType,
		false,
		serviceRequest.status,
		RequestStatus.ASSIGNED,
	);

	if (!canPerform) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			`Role ${authRole} is not authorized to transition request status to ASSIGNED`,
		);
	}

	// 4. Validate Target Technician
	const technician = await prisma.staffProfile.findUnique({
		where: { id: payload.technicianId },
		include: {
			user: true,
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	if (technician.user.role !== Role.STAFF) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Target user is not a staff member",
		);
	}

	if (technician.staffType !== StaffType.TECHNICIAN) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Assigned staff member is not a technician",
		);
	}

	if (
		technician.user.status !== UserStatus.ACTIVE ||
		technician.user.isDeleted
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician user account is inactive or deleted",
		);
	}

	if (!technician.isActive || technician.isDeleted) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician staff profile is inactive or deleted",
		);
	}

	// Critical Department Match Rule
	if (technician.departmentId !== requestDepartmentId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician does not belong to the department handling this request",
		);
	}

	// 5. Atomic Transaction: Deactivate previous active assignment + Create new Assignment + Update Status + Create History
	const result = await prisma.$transaction(async (tx) => {
		// Release any active/pending existing assignment
		await tx.assignment.updateMany({
			where: {
				serviceRequestId: requestId,
				status: {
					in: [AssignmentStatus.ACTIVE, AssignmentStatus.PENDING],
				},
			},
			data: {
				status: AssignmentStatus.RELEASED,
				releasedAt: new Date(),
			},
		});

		// Create new assignment
		const assignment = await tx.assignment.create({
			data: {
				serviceRequestId: requestId,
				technicianId: technician.id,
				assignedById: authUserId,
				status: AssignmentStatus.ACTIVE,
				notes: payload.note || null,
				assignedAt: new Date(),
			},
			include: {
				technician: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						department: true,
					},
				},
				serviceRequest: {
					select: {
						id: true,
						trackingNumber: true,
						status: true,
						title: true,
					},
				},
			},
		});

		// Update ServiceRequest status
		const updatedRequest = await tx.serviceRequest.update({
			where: { id: requestId },
			data: { status: RequestStatus.ASSIGNED },
			select: {
				id: true,
				trackingNumber: true,
				status: true,
			},
		});

		// Create status history record
		await tx.requestStatusHistory.create({
			data: {
				requestId: requestId,
				fromStatus: serviceRequest.status,
				toStatus: RequestStatus.ASSIGNED,
				changedById: authUserId,
				note: payload.note || `Assigned to technician ${technician.user.name}`,
			},
		});

		return {
			assignment,
			serviceRequest: updatedRequest,
		};
	});

	return result;
};

const acceptAssignment = async (
	assignmentId: string,
	authUserId: string,
	payload: IAcceptAssignmentPayload,
) => {
	// 1. Fetch Assignment with relations
	const assignment = await prisma.assignment.findUnique({
		where: { id: assignmentId },
		include: {
			technician: {
				include: {
					user: true,
				},
			},
			serviceRequest: true,
		},
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	// 2. Validate Assignment status
	if (assignment.status !== AssignmentStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Assignment is not active (current status: ${assignment.status})`,
		);
	}

	// 3. Strict Technician Ownership Check
	if (assignment.technician.userId !== authUserId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only the assigned technician can accept their own assignment",
		);
	}

	// 4. Validate Service Request status
	if (assignment.serviceRequest.status !== RequestStatus.ASSIGNED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request is in ${assignment.serviceRequest.status} state, expected ASSIGNED state for acceptance`,
		);
	}

	// 5. Atomic Transaction: Update Assignment status + ServiceRequest status + RequestStatusHistory
	const result = await prisma.$transaction(async (tx) => {
		const updatedNotes = payload.note
			? assignment.notes
				? `${assignment.notes} | Acceptance note: ${payload.note}`
				: payload.note
			: assignment.notes;

		const updatedAssignment = await tx.assignment.update({
			where: { id: assignmentId },
			data: {
				status: AssignmentStatus.ACCEPTED,
				acceptedAt: new Date(),
				notes: updatedNotes,
			},
			include: {
				technician: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						department: true,
					},
				},
				serviceRequest: {
					select: {
						id: true,
						trackingNumber: true,
						status: true,
						title: true,
					},
				},
			},
		});

		const updatedRequest = await tx.serviceRequest.update({
			where: { id: assignment.serviceRequestId },
			data: { status: RequestStatus.ACCEPTED },
			select: {
				id: true,
				trackingNumber: true,
				status: true,
			},
		});

		await tx.requestStatusHistory.create({
			data: {
				requestId: assignment.serviceRequestId,
				fromStatus: RequestStatus.ASSIGNED,
				toStatus: RequestStatus.ACCEPTED,
				changedById: authUserId,
				note: payload.note || "Assignment accepted by assigned technician",
			},
		});

		return {
			assignment: updatedAssignment,
			serviceRequest: updatedRequest,
		};
	});

	return result;
};

const getMyAssignments = async (
	authUserId: string,
	filters: IAssignmentFilterOptions,
) => {
	const staffProfile = await prisma.staffProfile.findUnique({
		where: { userId: authUserId },
	});

	if (!staffProfile || staffProfile.staffType !== StaffType.TECHNICIAN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only staff technicians can view their assigned work orders",
		);
	}

	const whereConditions: Prisma.AssignmentWhereInput = {
		technicianId: staffProfile.id,
	};

	if (filters.status) {
		whereConditions.status = filters.status;
	}

	const assignments = await prisma.assignment.findMany({
		where: whereConditions,
		include: {
			serviceRequest: {
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
					location: {
						include: {
							ward: true,
						},
					},
				},
			},
		},
		orderBy: {
			assignedAt: "desc",
		},
	});

	return assignments;
};

const getEligibleTechnicians = async (
	authUserId: string,
	authRole: Role,
	filters: IEligibleTechnicianFilterOptions,
) => {
	let departmentIdFilter = filters.departmentId;

	if (authRole === Role.STAFF) {
		const staffProfile = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});

		if (!staffProfile?.isActive || staffProfile.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Staff profile inactive or not found",
			);
		}

		// Enforce staff member's department
		departmentIdFilter = staffProfile.departmentId;
	} else if (authRole === Role.CITIZEN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Citizens cannot access technician lists",
		);
	}

	const whereConditions: Prisma.StaffProfileWhereInput = {
		staffType: StaffType.TECHNICIAN,
		isActive: true,
		isDeleted: false,
		user: {
			status: UserStatus.ACTIVE,
			isDeleted: false,
		},
	};

	if (departmentIdFilter) {
		whereConditions.departmentId = departmentIdFilter;
	}

	if (filters.searchTerm) {
		whereConditions.OR = [
			{ user: { name: { contains: filters.searchTerm, mode: "insensitive" } } },
			{ designation: { contains: filters.searchTerm, mode: "insensitive" } },
			{ employeeId: { contains: filters.searchTerm, mode: "insensitive" } },
		];
	}

	const technicians = await prisma.staffProfile.findMany({
		where: whereConditions,
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					status: true,
				},
			},
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
			assignments: {
				where: {
					status: AssignmentStatus.ACTIVE,
				},
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	// Transform to include active workload count
	const result = technicians.map((tech) => {
		const { assignments, ...rest } = tech;
		return {
			...rest,
			activeAssignmentsCount: assignments.length,
		};
	});

	return result;
};

export const AssignmentService = {
	assignTechnician,
	acceptAssignment,
	getMyAssignments,
	getEligibleTechnicians,
};
