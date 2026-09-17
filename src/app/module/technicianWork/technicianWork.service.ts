import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import {
	AssignmentStatus,
	EvidenceType,
	RequestStatus,
	Role,
	StaffType,
	UserStatus,
} from "../../../generated/prisma/client";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { canRolePerformTransition } from "../serviceRequest/serviceRequest.stateMachine";
import type {
	ICreateTechnicianUpdatePayload,
	ISubmitResolutionPayload,
	ITechnicianUpdateFilterOptions,
} from "./technicianWork.interface";

const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					resource_type: "auto",
					folder: "citycare/technician_evidence",
				},
				(error, result) => {
					if (error) return reject(error);
					if (!result)
						return reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from Cloudinary",
							),
						);
					resolve(result);
				},
			)
			.end(buffer);
	});
};

/**
 * Strict helper to verify technician identity, profile status, and active request assignment.
 */
const verifyTechnicianAssignment = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
) => {
	// 1. Authenticated user exists & is STAFF
	if (authRole !== Role.STAFF) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only staff technicians can perform work execution actions",
		);
	}

	// 2. User status check
	const user = await prisma.user.findUnique({
		where: { id: authUserId },
	});

	if (!user || user.status !== UserStatus.ACTIVE || user.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Technician user account is inactive or suspended",
		);
	}

	// 3. StaffProfile exists and staffType === TECHNICIAN
	const staffProfile = await prisma.staffProfile.findUnique({
		where: { userId: authUserId },
	});

	if (!staffProfile || staffProfile.staffType !== StaffType.TECHNICIAN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"User is not a registered technician profile",
		);
	}

	if (!staffProfile.isActive || staffProfile.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Technician staff profile is inactive or deleted",
		);
	}

	// 4. Request exists and is not deleted
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

	if (
		serviceRequest.status === RequestStatus.CLOSED ||
		serviceRequest.status === RequestStatus.REJECTED ||
		serviceRequest.status === RequestStatus.CANCELLED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request is in terminal state (${serviceRequest.status}) and cannot be modified`,
		);
	}

	// 5. Active assignment exists where technicianId matches authenticated staff profile ID
	const activeAssignment = await prisma.assignment.findFirst({
		where: {
			serviceRequestId: requestId,
			technicianId: staffProfile.id,
			status: {
				in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED],
			},
		},
	});

	if (!activeAssignment) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not actively assigned to this service request",
		);
	}

	return {
		user,
		staffProfile,
		serviceRequest,
		activeAssignment,
	};
};

const startWork = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	note?: string,
) => {
	const { staffProfile, serviceRequest } = await verifyTechnicianAssignment(
		requestId,
		authUserId,
		authRole,
	);

	// Validate allowed state: ACCEPTED -> IN_PROGRESS
	if (serviceRequest.status !== RequestStatus.ACCEPTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request must be in ACCEPTED state to start work. Current state: ${serviceRequest.status}`,
		);
	}

	const canPerform = canRolePerformTransition(
		authRole,
		staffProfile.staffType,
		false,
		serviceRequest.status,
		RequestStatus.IN_PROGRESS,
	);

	if (!canPerform) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			`State transition from ${serviceRequest.status} to IN_PROGRESS is not permitted for your role`,
		);
	}

	// Atomic transaction
	const now = new Date();
	const result = await prisma.$transaction(
		async (tx) => {
			const updatedRequest = await tx.serviceRequest.update({
				where: { id: requestId },
				data: {
					status: RequestStatus.IN_PROGRESS,
					responseStartedAt: serviceRequest.responseStartedAt || now,
					responseCompletedAt: serviceRequest.responseCompletedAt || now,
					resolutionStartedAt: serviceRequest.resolutionStartedAt || now,
				},
				select: {
					id: true,
					trackingNumber: true,
					status: true,
					responseStartedAt: true,
					responseCompletedAt: true,
					resolutionStartedAt: true,
					updatedAt: true,
				},
			});

			const historyRecord = await tx.requestStatusHistory.create({
				data: {
					requestId: requestId,
					fromStatus: RequestStatus.ACCEPTED,
					toStatus: RequestStatus.IN_PROGRESS,
					changedById: authUserId,
					note: note || "Technician started work on service request",
				},
			});

			return {
				serviceRequest: updatedRequest,
				statusHistory: historyRecord,
			};
		},
		{ timeout: 20000, maxWait: 10000 },
	);

	return result;
};

const createTechnicianUpdate = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	payload: ICreateTechnicianUpdatePayload,
	uploadedFiles?: Express.Multer.File[],
) => {
	const { staffProfile, serviceRequest } = await verifyTechnicianAssignment(
		requestId,
		authUserId,
		authRole,
	);

	if (serviceRequest.status !== RequestStatus.IN_PROGRESS) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Technician updates can only be submitted when request is IN_PROGRESS. Current status: ${serviceRequest.status}`,
		);
	}

	if (!payload.message || payload.message.trim().length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Update message must not be empty",
		);
	}

	// Progress percentage check: integer 0-100, non-decreasing
	if (payload.progressPercentage !== undefined) {
		if (
			!Number.isInteger(payload.progressPercentage) ||
			payload.progressPercentage < 0 ||
			payload.progressPercentage > 100
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Progress percentage must be an integer between 0 and 100",
			);
		}

		// Query latest update with progressPercentage
		const latestUpdate = await prisma.technicianUpdate.findFirst({
			where: { serviceRequestId: requestId },
			orderBy: { createdAt: "desc" },
		});

		if (
			latestUpdate &&
			latestUpdate.progressPercentage !== null &&
			payload.progressPercentage < latestUpdate.progressPercentage
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Progress percentage cannot decrease. Latest progress was ${latestUpdate.progressPercentage}%, attempted ${payload.progressPercentage}%`,
			);
		}
	}

	// Handle Cloudinary evidence photo uploads
	const uploadedAttachmentsMetadata: Array<{
		fileUrl: string;
		filePublicId: string;
		fileName: string;
		fileType: string;
		fileSize: number;
	}> = [];

	if (uploadedFiles && uploadedFiles.length > 0) {
		for (const file of uploadedFiles) {
			try {
				const uploadResult = await uploadToCloudinary(file.buffer);
				uploadedAttachmentsMetadata.push({
					fileUrl: uploadResult.secure_url,
					filePublicId: uploadResult.public_id,
					fileName: file.originalname,
					fileType: file.mimetype,
					fileSize: file.size,
				});
			} catch (err) {
				console.error("Failed uploading evidence file to Cloudinary:", err);
				throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"Failed to upload evidence photo to cloud storage",
				);
			}
		}
	}

	// Atomic transaction
	const result = await prisma.$transaction(
		async (tx) => {
			const updateRecord = await tx.technicianUpdate.create({
				data: {
					serviceRequestId: requestId,
					technicianId: staffProfile.id,
					message: payload.message.trim(),
					progressPercentage: payload.progressPercentage ?? null,
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
						},
					},
				},
			});

			const attachmentRecords = [];
			for (const att of uploadedAttachmentsMetadata) {
				const createdAtt = await tx.requestAttachment.create({
					data: {
						requestId: requestId,
						fileUrl: att.fileUrl,
						filePublicId: att.filePublicId,
						fileName: att.fileName,
						fileType: att.fileType,
						fileSize: att.fileSize,
						uploadedById: authUserId,
						evidenceType: payload.evidenceType || EvidenceType.PROGRESS,
						technicianUpdateId: updateRecord.id,
					},
				});
				attachmentRecords.push(createdAtt);
			}

			return {
				...updateRecord,
				attachments: attachmentRecords,
			};
		},
		{ timeout: 20000, maxWait: 10000 },
	);

	return result;
};

const getTechnicianUpdates = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	filters: ITechnicianUpdateFilterOptions,
) => {
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

	// Access Control
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (!citizen || serviceRequest.citizenId !== citizen.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view updates for another citizen's request",
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
				"You are not authorized to view requests outside your department",
			);
		}
	}

	const page = Number(filters.page || 1);
	const limit = Number(filters.limit || 20);
	const skip = (page - 1) * limit;

	const [updates, total] = await Promise.all([
		prisma.technicianUpdate.findMany({
			where: { serviceRequestId: requestId },
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
					},
				},
				attachments: true,
			},
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.technicianUpdate.count({
			where: { serviceRequestId: requestId },
		}),
	]);

	return {
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
		data: updates,
	};
};

const submitResolution = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	payload: ISubmitResolutionPayload,
	uploadedFiles?: Express.Multer.File[],
) => {
	const { staffProfile, serviceRequest } = await verifyTechnicianAssignment(
		requestId,
		authUserId,
		authRole,
	);

	if (serviceRequest.status !== RequestStatus.IN_PROGRESS) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Resolution can only be submitted when request is IN_PROGRESS. Current status: ${serviceRequest.status}`,
		);
	}

	if (!payload.summary || payload.summary.trim().length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolution summary is required",
		);
	}

	if (!payload.details || payload.details.trim().length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolution details are required",
		);
	}

	const canPerform = canRolePerformTransition(
		authRole,
		staffProfile.staffType,
		false,
		serviceRequest.status,
		RequestStatus.RESOLUTION_SUBMITTED,
	);

	if (!canPerform) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			`State transition from ${serviceRequest.status} to RESOLUTION_SUBMITTED is not permitted for your role`,
		);
	}

	// Handle Cloudinary evidence uploads
	const uploadedAttachmentsMetadata: Array<{
		fileUrl: string;
		filePublicId: string;
		fileName: string;
		fileType: string;
		fileSize: number;
	}> = [];

	if (uploadedFiles && uploadedFiles.length > 0) {
		for (const file of uploadedFiles) {
			try {
				const uploadResult = await uploadToCloudinary(file.buffer);
				uploadedAttachmentsMetadata.push({
					fileUrl: uploadResult.secure_url,
					filePublicId: uploadResult.public_id,
					fileName: file.originalname,
					fileType: file.mimetype,
					fileSize: file.size,
				});
			} catch (err) {
				console.error("Failed uploading resolution evidence file:", err);
				throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"Failed to upload resolution evidence photo to cloud storage",
				);
			}
		}
	}

	// Atomic transaction: Create Resolution + Save attachments + Update Request Status + Create History
	const result = await prisma.$transaction(
		async (tx) => {
			const resolutionRecord = await tx.resolution.create({
				data: {
					serviceRequestId: requestId,
					submittedById: authUserId,
					summary: payload.summary.trim(),
					details: payload.details.trim(),
					completedAt: new Date(),
				},
				include: {
					submittedBy: {
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
						},
					},
				},
			});

			const attachmentRecords = [];
			for (const att of uploadedAttachmentsMetadata) {
				const createdAtt = await tx.requestAttachment.create({
					data: {
						requestId: requestId,
						fileUrl: att.fileUrl,
						filePublicId: att.filePublicId,
						fileName: att.fileName,
						fileType: att.fileType,
						fileSize: att.fileSize,
						uploadedById: authUserId,
						evidenceType: payload.evidenceType || EvidenceType.AFTER,
						resolutionId: resolutionRecord.id,
					},
				});
				attachmentRecords.push(createdAtt);
			}

			const updatedRequest = await tx.serviceRequest.update({
				where: { id: requestId },
				data: { status: RequestStatus.RESOLUTION_SUBMITTED },
				select: {
					id: true,
					trackingNumber: true,
					status: true,
					updatedAt: true,
				},
			});

			const historyRecord = await tx.requestStatusHistory.create({
				data: {
					requestId: requestId,
					fromStatus: RequestStatus.IN_PROGRESS,
					toStatus: RequestStatus.RESOLUTION_SUBMITTED,
					changedById: authUserId,
					note: `Resolution submitted: ${payload.summary.trim()}`,
				},
			});

			return {
				resolution: {
					...resolutionRecord,
					attachments: attachmentRecords,
				},
				serviceRequest: updatedRequest,
				statusHistory: historyRecord,
			};
		},
		{ timeout: 20000, maxWait: 10000 },
	);

	return result;
};

const getResolution = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
) => {
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

	// Access Control
	if (authRole === Role.CITIZEN) {
		const citizen = await prisma.citizen.findFirst({
			where: { userId: authUserId, isDeleted: false },
		});
		if (!citizen || serviceRequest.citizenId !== citizen.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view resolution for another citizen's request",
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
				"You are not authorized to view requests outside your department",
			);
		}
	}

	const resolution = await prisma.resolution.findFirst({
		where: { serviceRequestId: requestId },
		orderBy: { createdAt: "desc" },
		include: {
			submittedBy: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
			attachments: true,
		},
	});

	if (!resolution) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No resolution submitted yet for this service request",
		);
	}

	return resolution;
};

const uploadEvidence = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	evidenceType: EvidenceType = EvidenceType.OTHER,
	uploadedFiles?: Express.Multer.File[],
) => {
	const { serviceRequest } = await verifyTechnicianAssignment(
		requestId,
		authUserId,
		authRole,
	);

	if (
		serviceRequest.status !== RequestStatus.ACCEPTED &&
		serviceRequest.status !== RequestStatus.IN_PROGRESS
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Evidence can only be uploaded when request is ACCEPTED or IN_PROGRESS. Current status: ${serviceRequest.status}`,
		);
	}

	if (!uploadedFiles || uploadedFiles.length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"At least one evidence photo file is required",
		);
	}

	const attachmentRecords = [];
	for (const file of uploadedFiles) {
		try {
			const uploadResult = await uploadToCloudinary(file.buffer);
			const createdAtt = await prisma.requestAttachment.create({
				data: {
					requestId: requestId,
					fileUrl: uploadResult.secure_url,
					filePublicId: uploadResult.public_id,
					fileName: file.originalname,
					fileType: file.mimetype,
					fileSize: file.size,
					uploadedById: authUserId,
					evidenceType: evidenceType,
				},
			});
			attachmentRecords.push(createdAtt);
		} catch (err) {
			console.error("Evidence upload failed:", err);
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Failed to upload evidence file to cloud storage",
			);
		}
	}

	return attachmentRecords;
};

export const TechnicianWorkService = {
	startWork,
	createTechnicianUpdate,
	getTechnicianUpdates,
	submitResolution,
	getResolution,
	uploadEvidence,
};
