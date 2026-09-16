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
import type {
	IAttachmentFilterOptions,
	IUploadAttachmentPayload,
} from "./attachment.interface";

// 5 MB limit in bytes
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Validates uploaded file MIME type, extension, and file size.
 */
const validateFileStrictly = (file: Express.Multer.File) => {
	if (!file || !file.buffer || file.buffer.length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"File buffer is empty or missing",
		);
	}

	if (
		file.size > MAX_FILE_SIZE_BYTES ||
		file.buffer.length > MAX_FILE_SIZE_BYTES
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`File "${file.originalname}" exceeds maximum allowed size of 5 MB`,
		);
	}

	const mime = file.mimetype.toLowerCase();
	if (!ALLOWED_MIME_TYPES.has(mime)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Invalid file MIME type "${file.mimetype}". Allowed types: JPEG, PNG, WEBP`,
		);
	}

	const fileName = file.originalname.toLowerCase();
	const extIndex = fileName.lastIndexOf(".");
	if (extIndex === -1) {
		throw new AppError(httpStatus.BAD_REQUEST, "File missing file extension");
	}

	const ext = fileName.substring(extIndex);
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Invalid file extension "${ext}". Allowed extensions: .jpg, .jpeg, .png, .webp`,
		);
	}
};

/**
 * Uploads file buffer to Cloudinary stream asynchronously.
 */
const uploadStreamToCloudinary = (
	buffer: Buffer,
): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					resource_type: "image",
					folder: "citycare/attachments",
				},
				(error, result) => {
					if (error) return reject(error);
					if (!result)
						return reject(
							new Error("No response received from Cloudinary storage"),
						);
					resolve(result);
				},
			)
			.end(buffer);
	});
};

/**
 * Helper to upload attachments for a Service Request with RBAC, ownership, assignment, and state checks.
 */
const uploadAttachments = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	files: Express.Multer.File[],
	payload: IUploadAttachmentPayload,
) => {
	if (!files || files.length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"At least one file is required for attachment upload",
		);
	}

	// 1. Fetch user & status
	const user = await prisma.user.findUnique({
		where: { id: authUserId },
	});
	if (!user || user.status !== UserStatus.ACTIVE || user.isDeleted) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"User account is inactive or deleted",
		);
	}

	// 2. Fetch service request
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: requestId, isDeleted: false },
		include: {
			citizen: true,
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

	// Terminal state guard
	if (
		serviceRequest.status === RequestStatus.CLOSED ||
		serviceRequest.status === RequestStatus.REJECTED ||
		serviceRequest.status === RequestStatus.CANCELLED ||
		serviceRequest.status === RequestStatus.DUPLICATE
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service request is in terminal state (${serviceRequest.status}) and cannot accept new attachments`,
		);
	}

	let targetEvidenceType: EvidenceType = EvidenceType.OTHER;

	// 3. Role-specific validation & state rules
	if (authRole === Role.CITIZEN) {
		if (serviceRequest.citizen.userId !== authUserId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to upload attachments to another citizen's request",
			);
		}

		if (
			serviceRequest.status !== RequestStatus.SUBMITTED &&
			serviceRequest.status !== RequestStatus.UNDER_REVIEW
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Citizens can only upload complaint attachments during SUBMITTED or UNDER_REVIEW state. Current state: ${serviceRequest.status}`,
			);
		}

		targetEvidenceType = payload.attachmentType || EvidenceType.COMPLAINT;
	} else if (authRole === Role.STAFF) {
		const staffProfile = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});
		if (!staffProfile || !staffProfile.isActive || staffProfile.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Staff profile is inactive or not found",
			);
		}

		if (staffProfile.staffType === StaffType.TECHNICIAN) {
			// Check active assignment for this technician
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
					"You are not actively assigned to work on this service request",
				);
			}

			if (
				serviceRequest.status !== RequestStatus.IN_PROGRESS &&
				serviceRequest.status !== RequestStatus.ACCEPTED
			) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					`Technicians can only upload evidence while request is in work execution state. Current state: ${serviceRequest.status}`,
				);
			}

			targetEvidenceType = payload.attachmentType || EvidenceType.PROGRESS;
		} else {
			// Officer / Manager department scoping
			if (
				staffProfile.departmentId !==
				serviceRequest.service.category.departmentId
			) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You are not authorized to upload attachments for requests outside your department",
				);
			}
			targetEvidenceType = payload.attachmentType || EvidenceType.OTHER;
		}
	} else if (authRole === Role.ADMIN || authRole === Role.SUPER_ADMIN) {
		targetEvidenceType = payload.attachmentType || EvidenceType.OTHER;
	}

	// 4. Validate all files before uploading any to Cloudinary
	for (const file of files) {
		validateFileStrictly(file);
	}

	// 5. Upload files to Cloudinary and insert records into DB
	const createdAttachments = [];

	for (const file of files) {
		let uploadedResult: UploadApiResponse | null = null;
		try {
			uploadedResult = await uploadStreamToCloudinary(file.buffer);

			const attachmentRecord = await prisma.requestAttachment.create({
				data: {
					requestId: requestId,
					fileUrl: uploadedResult.secure_url,
					filePublicId: uploadedResult.public_id,
					fileName: file.originalname.trim(),
					fileType: file.mimetype.toLowerCase(),
					fileSize: file.size,
					uploadedById: authUserId,
					evidenceType: targetEvidenceType,
				},
				include: {
					uploadedBy: {
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
						},
					},
				},
			});

			createdAttachments.push(attachmentRecord);
		} catch (err) {
			// Out-of-sync safety: if DB insert fails after Cloudinary upload succeeds, clean up Cloudinary file
			if (uploadedResult?.public_id) {
				try {
					await cloudinary.uploader.destroy(uploadedResult.public_id);
				} catch (cleanupErr) {
					console.error(
						"Failed to clean up Cloudinary object after DB error:",
						cleanupErr,
					);
				}
			}
			throw err;
		}
	}

	return createdAttachments;
};

/**
 * Retrieves all attachments for a Service Request with scoped authorization.
 */
const getRequestAttachments = async (
	requestId: string,
	authUserId: string,
	authRole: Role,
	filters: IAttachmentFilterOptions,
) => {
	// Verify service request exists
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: requestId, isDeleted: false },
		include: {
			citizen: true,
			service: {
				include: {
					category: true,
				},
			},
		},
	});

	if (!serviceRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	// Scoped authorization checks
	if (authRole === Role.CITIZEN) {
		if (serviceRequest.citizen.userId !== authUserId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view attachments of another citizen's request",
			);
		}
	} else if (authRole === Role.STAFF) {
		const staffProfile = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});

		if (!staffProfile || !staffProfile.isActive || staffProfile.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Staff profile is inactive or not found",
			);
		}

		if (staffProfile.staffType === StaffType.TECHNICIAN) {
			// Check if assigned or past assigned to this request
			const assignment = await prisma.assignment.findFirst({
				where: {
					serviceRequestId: requestId,
					technicianId: staffProfile.id,
				},
			});

			if (!assignment) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You are not authorized to view attachments for an unassigned service request",
				);
			}
		} else if (
			staffProfile.departmentId !== serviceRequest.service.category.departmentId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to view attachments outside your department",
			);
		}
	}

	const whereClause: any = {
		requestId: requestId,
	};

	if (filters.attachmentType) {
		whereClause.evidenceType = filters.attachmentType;
	}

	const attachments = await prisma.requestAttachment.findMany({
		where: whereClause,
		orderBy: { createdAt: "asc" },
		include: {
			uploadedBy: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
				},
			},
		},
	});

	return attachments;
};

/**
 * Safely deletes an attachment from database and Cloudinary storage.
 */
const deleteAttachment = async (
	requestId: string,
	attachmentId: string,
	authUserId: string,
	authRole: Role,
) => {
	// 1. Fetch attachment and service request
	const attachment = await prisma.requestAttachment.findFirst({
		where: {
			id: attachmentId,
			requestId: requestId,
		},
		include: {
			serviceRequest: {
				include: {
					citizen: true,
				},
			},
		},
	});

	if (!attachment) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Attachment record not found for this service request",
		);
	}

	const serviceRequest = attachment.serviceRequest;

	// State Guard: Historical evidence preservation rule
	if (
		serviceRequest.status === RequestStatus.RESOLUTION_SUBMITTED ||
		serviceRequest.status === RequestStatus.RESOLVED ||
		serviceRequest.status === RequestStatus.CLOSED ||
		serviceRequest.status === RequestStatus.CANCELLED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Historical evidence cannot be deleted when service request is in state: ${serviceRequest.status}`,
		);
	}

	// 2. Ownership & Authorization checks
	if (authRole === Role.CITIZEN) {
		if (
			attachment.uploadedById !== authUserId ||
			serviceRequest.citizen.userId !== authUserId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only delete attachments uploaded by yourself on your own service request",
			);
		}

		if (
			serviceRequest.status !== RequestStatus.SUBMITTED &&
			serviceRequest.status !== RequestStatus.UNDER_REVIEW
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Citizens can only delete attachments during early editable request states. Current state: ${serviceRequest.status}`,
			);
		}
	} else if (authRole === Role.STAFF) {
		const staffProfile = await prisma.staffProfile.findUnique({
			where: { userId: authUserId },
		});
		if (!staffProfile || !staffProfile.isActive || staffProfile.isDeleted) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Staff profile is inactive or not found",
			);
		}

		if (staffProfile.staffType === StaffType.TECHNICIAN) {
			if (attachment.uploadedById !== authUserId) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Technicians can only delete evidence files uploaded by themselves",
				);
			}

			if (
				serviceRequest.status !== RequestStatus.IN_PROGRESS &&
				serviceRequest.status !== RequestStatus.ACCEPTED
			) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					`Technicians can only delete work evidence while work is in progress. Current state: ${serviceRequest.status}`,
				);
			}
		}
	}

	// 3. Destroy Cloudinary file if publicId exists
	if (attachment.filePublicId) {
		try {
			await cloudinary.uploader.destroy(attachment.filePublicId);
		} catch (err) {
			console.error("Cloudinary file destruction error:", err);
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Failed to delete file from cloud storage",
			);
		}
	}

	// 4. Delete database record
	await prisma.requestAttachment.delete({
		where: { id: attachmentId },
	});

	return {
		id: attachmentId,
		deleted: true,
	};
};

export const AttachmentService = {
	uploadAttachments,
	getRequestAttachments,
	deleteAttachment,
};
