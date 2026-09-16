import httpStatus from "http-status";
import {
	AssignmentStatus,
	NotificationType,
	RequestStatus,
	Role,
	StaffType,
	UserStatus,
	VerificationDecision,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { NotificationService } from "../notification/notification.service";
import { canRolePerformTransition } from "../serviceRequest/serviceRequest.stateMachine";
import type { IVerifyResolutionPayload } from "./resolutionVerification.interface";

const verifyResolution = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	payload: IVerifyResolutionPayload,
) => {
	// 1. Validate Verifier User Account
	const user = await prisma.user.findUnique({
		where: { id: authUserId },
	});

	if (!user || user.status !== UserStatus.ACTIVE || user.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Verifier account is inactive or suspended",
		);
	}

	// 2. Validate Role & Staff Type Authority
	let verifierStaffType: StaffType | null = null;
	let verifierDepartmentId: string | null = null;

	if (authRole === Role.CITIZEN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Citizens are not authorized to verify service request resolutions",
		);
	}

	if (authRole === Role.STAFF) {
		const staffProfile = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});

		if (!staffProfile || !staffProfile.isActive || staffProfile.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Verifier staff profile is inactive or not found",
			);
		}

		if (staffProfile.staffType === StaffType.TECHNICIAN) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Technicians cannot verify service request resolutions",
			);
		}

		verifierStaffType = staffProfile.staffType;
		verifierDepartmentId = staffProfile.departmentId;
	}

	// 3. Fetch ServiceRequest with department relation
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: requestId, isDeleted: false },
		include: {
			citizen: {
				include: { user: true },
			},
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

	// Department Scoping Rule for STAFF
	if (
		authRole === Role.STAFF &&
		verifierDepartmentId &&
		verifierDepartmentId !== requestDepartmentId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Staff members can only verify service requests belonging to their own department",
		);
	}

	// 4. Validate Request Status (Must be RESOLUTION_SUBMITTED)
	if (serviceRequest.status !== RequestStatus.RESOLUTION_SUBMITTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request must be in RESOLUTION_SUBMITTED state for verification. Current status: ${serviceRequest.status}`,
		);
	}

	// 5. Fetch latest submitted resolution
	const latestResolution = await prisma.resolution.findFirst({
		where: { serviceRequestId: requestId },
		orderBy: { createdAt: "desc" },
	});

	if (!latestResolution) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No submitted resolution record found for this service request",
		);
	}

	// 6. TECHNICIAN SELF-VERIFICATION GUARD: Prevent technician from verifying their own resolution
	if (latestResolution.submittedById === authUserId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Technicians are strictly forbidden from verifying their own work resolution",
		);
	}

	// Check if verifier is the assigned technician on the active/accepted assignment
	const assignedTechnicianAssignment = await prisma.assignment.findFirst({
		where: {
			serviceRequestId: requestId,
			status: {
				in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED],
			},
			technician: {
				userId: authUserId,
			},
		},
	});

	if (assignedTechnicianAssignment) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Assigned technicians are strictly forbidden from verifying their own work resolution",
		);
	}

	// 7. Validate Verification Decision & State Machine Policy
	const targetStatus =
		payload.decision === VerificationDecision.APPROVED
			? RequestStatus.RESOLVED
			: RequestStatus.IN_PROGRESS;

	const canPerform = canRolePerformTransition(
		authRole,
		verifierStaffType,
		false,
		serviceRequest.status,
		targetStatus,
	);

	if (!canPerform) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			`State transition from ${serviceRequest.status} to ${targetStatus} is not permitted for your role`,
		);
	}

	if (
		payload.decision === VerificationDecision.REWORK_REQUIRED &&
		(!payload.comments || payload.comments.trim().length === 0)
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Comments are mandatory when decision is REWORK_REQUIRED",
		);
	}

	// 8. Atomic Transaction: Create ResolutionVerification + Update Request Status + Create Status History
	const result = await prisma.$transaction(
		async (tx) => {
			const verificationRecord = await tx.resolutionVerification.create({
				data: {
					serviceRequestId: requestId,
					resolutionId: latestResolution.id,
					verifiedById: authUserId,
					decision: payload.decision,
					comments: payload.comments ? payload.comments.trim() : null,
					verifiedAt: new Date(),
				},
				include: {
					verifiedBy: {
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
						},
					},
				},
			});

			const requestUpdateData: {
				status: RequestStatus;
				resolutionCompletedAt?: Date;
			} = {
				status: targetStatus,
			};

			if (payload.decision === VerificationDecision.APPROVED) {
				requestUpdateData.resolutionCompletedAt = new Date();
			} else if (payload.decision === VerificationDecision.REWORK_REQUIRED) {
				await tx.assignment.updateMany({
					where: {
						serviceRequestId: requestId,
					},
					data: {
						notes: payload.comments
							? `[REWORK REQUIRED] ${payload.comments.trim()}`
							: "[REWORK REQUIRED]",
					},
				});
			}

			const updatedRequest = await tx.serviceRequest.update({
				where: { id: requestId },
				data: requestUpdateData,
				select: {
					id: true,
					trackingNumber: true,
					status: true,
					resolutionCompletedAt: true,
					updatedAt: true,
				},
			});

			const historyRecord = await tx.requestStatusHistory.create({
				data: {
					requestId: requestId,
					fromStatus: RequestStatus.RESOLUTION_SUBMITTED,
					toStatus: targetStatus,
					changedById: authUserId,
					note: `Resolution verification decision: ${payload.decision}. ${
						payload.comments ? `Comments: ${payload.comments.trim()}` : ""
					}`,
				},
			});

			return {
				verification: verificationRecord,
				serviceRequest: updatedRequest,
				statusHistory: historyRecord,
			};
		},
		{ timeout: 20000, maxWait: 10000 },
	);

	if (
		payload.decision === VerificationDecision.APPROVED &&
		serviceRequest.citizen
	) {
		await NotificationService.dispatchNotification({
			userId: serviceRequest.citizen.userId,
			type: NotificationType.REQUEST_RESOLVED,
			title: "Service Request Resolved",
			message: `Your service request ${serviceRequest.trackingNumber} has been verified and resolved.`,
			entityType: "SERVICE_REQUEST",
			entityId: serviceRequest.id,
			userName: serviceRequest.citizen.user.name,
			userEmail: serviceRequest.citizen.user.email,
		});
	}

	return result;
};

export const ResolutionVerificationService = {
	verifyResolution,
};
