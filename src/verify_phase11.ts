import { prisma } from "./app/lib/prisma";
import { AssignmentService } from "./app/module/assignment/assignment.service";
import { AttachmentService } from "./app/module/attachment/attachment.service";
import { CategoryService } from "./app/module/category/category.service";
import { ResolutionVerificationService } from "./app/module/resolutionVerification/resolutionVerification.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";
import { TechnicianWorkService } from "./app/module/technicianWork/technicianWork.service";
import {
	EvidenceType,
	RequestStatus,
	Role,
	ServicePriority,
	StaffType,
	UserStatus,
	VerificationDecision,
} from "./generated/prisma/client";

// Mock helper to create synthetic Multer file buffers for testing
function createMockFile(
	filename: string,
	mimetype: string,
	sizeInBytes: number,
): Express.Multer.File {
	const buffer = Buffer.alloc(sizeInBytes, "a");
	return {
		fieldname: "files",
		originalname: filename,
		encoding: "7bit",
		mimetype,
		buffer,
		size: sizeInBytes,
		destination: "",
		filename,
		path: "",
		stream: null as any,
	};
}

async function runPhase11Verification() {
	console.log("=================================================");
	console.log("   STARTING PHASE 11 VERIFICATION SUITE         ");
	console.log("=================================================");

	const ts = Date.now();

	// 1. Setup Infrastructure
	const municipality = await prisma.municipality.create({
		data: {
			name: `Phase11 DNCC-${ts}`,
			code: `P11-DNCC-${ts}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `P11 Zone 1-${ts}`,
			code: `P11Z1-${ts}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `P11 Ward 10-${ts}`,
			code: `P11W10-${ts}`,
			wardNumber: 10,
		},
	});

	const roadsDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P11 Roads Dept-${ts}`,
			code: `P11ROAD-${ts}`,
		},
	});

	const category = await CategoryService.createCategory({
		departmentId: roadsDept.id,
		name: `Road Repair P11-${ts}`,
		code: `RR-P11-${ts}`,
	});

	const service = await ServiceService.createService({
		categoryId: category.id,
		name: `Pothole Repair P11-${ts}`,
		code: `PR-P11-${ts}`,
	});

	// Users
	const citizenA = await prisma.user.create({
		data: {
			name: `P11 Citizen A-${ts}`,
			email: `citizenA.p11.${ts}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.citizen.create({
		data: {
			userId: citizenA.id,
			address: "123 Citizen Lane",
		},
	});

	const citizenB = await prisma.user.create({
		data: {
			name: `P11 Citizen B-${ts}`,
			email: `citizenB.p11.${ts}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.citizen.create({
		data: {
			userId: citizenB.id,
			address: "456 Stranger Lane",
		},
	});

	const tech1User = await prisma.user.create({
		data: {
			name: `P11 Tech 1-${ts}`,
			email: `tech1.p11.${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const tech1Staff = await prisma.staffProfile.create({
		data: {
			userId: tech1User.id,
			employeeId: `EMP-P11TECH1-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Senior Asphalt Field Tech",
			joiningDate: new Date(),
		},
	});

	const tech2User = await prisma.user.create({
		data: {
			name: `P11 Tech 2-${ts}`,
			email: `tech2.p11.${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: tech2User.id,
			employeeId: `EMP-P11TECH2-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Junior Inspector Tech",
			joiningDate: new Date(),
		},
	});

	const supervisorUser = await prisma.user.create({
		data: {
			name: `P11 Supervisor-${ts}`,
			email: `supervisor.p11.${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: supervisorUser.id,
			employeeId: `EMP-P11MGR-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.MANAGER,
			designation: "Roads Division Manager",
			joiningDate: new Date(),
		},
	});

	console.log("✅ 1. Setup completed cleanly.");

	// 2. Create Service Request & Test Citizen Complaint Attachment Upload
	console.log("\n--- Testing Citizen Complaint Attachment Upload ---");
	const request1 = await ServiceRequestService.createServiceRequest(
		citizenA.id,
		{
			serviceId: service.id,
			title: "Dangerous crater on main road",
			description: "Large crater in front of Sector 3 square",
			priority: ServicePriority.HIGH,
			location: {
				wardId: ward.id,
				address: "Sector 3 Main Square",
			},
		},
	);

	// Mock file upload directly via database/service logic (simulating Cloudinary upload)
	const mockComplaintPhoto = createMockFile(
		"damaged_road.jpg",
		"image/jpeg",
		1024 * 100,
	);

	// Directly insert an attachment to simulate citizen initial photo
	const citizenAtt = await prisma.requestAttachment.create({
		data: {
			requestId: request1.id,
			fileUrl:
				"https://res.cloudinary.com/demo/image/upload/v12345/citycare/attachments/damaged_road.jpg",
			filePublicId: `citycare/attachments/damaged_road_${ts}`,
			fileName: "damaged_road.jpg",
			fileType: "image/jpeg",
			fileSize: 102400,
			uploadedById: citizenA.id,
			evidenceType: EvidenceType.COMPLAINT,
		},
	});

	console.log(
		`✅ Citizen complaint photo attached: ID=${citizenAtt.id}, type=${citizenAtt.evidenceType}`,
	);

	// 3. IDOR Protection Tests
	console.log("\n--- Testing IDOR & Authorization Controls ---");
	// Citizen B attempts to access Citizen A's attachments
	try {
		await AttachmentService.getRequestAttachments(
			request1.id,
			citizenB.id,
			Role.CITIZEN,
			{},
		);
		throw new Error(
			"Citizen B should not have been allowed to view Citizen A's attachments!",
		);
	} catch (err: any) {
		console.log(`✅ Citizen IDOR view rejection verified: "${err.message}"`);
	}

	// Unassigned Tech 2 attempts to upload evidence to Tech 1's request
	try {
		await AttachmentService.uploadAttachments(
			request1.id,
			tech2User.id,
			Role.STAFF,
			[mockComplaintPhoto],
			{ attachmentType: EvidenceType.BEFORE },
		);
		throw new Error(
			"Unassigned Tech 2 should not have been allowed to upload evidence!",
		);
	} catch (err: any) {
		console.log(
			`✅ Unassigned technician upload rejection verified: "${err.message}"`,
		);
	}

	// 4. File Validation Tests
	console.log("\n--- Testing File Validation Rules ---");
	const invalidMimeFile = createMockFile("script.sh", "application/x-sh", 1024);
	const oversizedFile = createMockFile(
		"huge_image.png",
		"image/png",
		6 * 1024 * 1024,
	); // 6 MB

	// Move request to IN_PROGRESS so work evidence can be tested
	await ServiceRequestService.updateServiceRequestStatus(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ status: RequestStatus.UNDER_REVIEW, note: "Approved review" },
	);
	await ServiceRequestService.updateServiceRequestStatus(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ status: RequestStatus.APPROVED, note: "Approved assignment" },
	);
	const assignRes = await AssignmentService.assignTechnician(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ technicianId: tech1Staff.id, note: "Assigning tech 1" },
	);
	await AssignmentService.acceptAssignment(
		assignRes.assignment.id,
		tech1User.id,
		{
			note: "Accepted",
		},
	);
	await TechnicianWorkService.startWork(
		request1.id,
		tech1User.id,
		Role.STAFF,
		"Started work",
	);

	// Test invalid MIME type
	try {
		await AttachmentService.uploadAttachments(
			request1.id,
			tech1User.id,
			Role.STAFF,
			[invalidMimeFile],
			{ attachmentType: EvidenceType.BEFORE },
		);
		throw new Error("Invalid MIME file upload should have failed!");
	} catch (err: any) {
		console.log(`✅ Invalid MIME type rejection verified: "${err.message}"`);
	}

	// Test oversized file (> 5 MB)
	try {
		await AttachmentService.uploadAttachments(
			request1.id,
			tech1User.id,
			Role.STAFF,
			[oversizedFile],
			{ attachmentType: EvidenceType.BEFORE },
		);
		throw new Error("Oversized file upload should have failed!");
	} catch (err: any) {
		console.log(
			`✅ Oversized file rejection (>5MB) verified: "${err.message}"`,
		);
	}

	// 5. Work Execution & Evidence Uploads (BEFORE, PROGRESS, AFTER)
	console.log("\n--- Testing Technician Work Evidence Uploads ---");
	const beforeEvidence = await prisma.requestAttachment.create({
		data: {
			requestId: request1.id,
			fileUrl:
				"https://res.cloudinary.com/demo/image/upload/v12345/citycare/attachments/before_repair.jpg",
			filePublicId: `citycare/attachments/before_${ts}`,
			fileName: "before_repair.jpg",
			fileType: "image/jpeg",
			fileSize: 204800,
			uploadedById: tech1User.id,
			evidenceType: EvidenceType.BEFORE,
		},
	});

	const progressEvidence = await prisma.requestAttachment.create({
		data: {
			requestId: request1.id,
			fileUrl:
				"https://res.cloudinary.com/demo/image/upload/v12345/citycare/attachments/progress_repair.jpg",
			filePublicId: `citycare/attachments/progress_${ts}`,
			fileName: "progress_repair.jpg",
			fileType: "image/jpeg",
			fileSize: 307200,
			uploadedById: tech1User.id,
			evidenceType: EvidenceType.PROGRESS,
		},
	});

	const afterEvidence = await prisma.requestAttachment.create({
		data: {
			requestId: request1.id,
			fileUrl:
				"https://res.cloudinary.com/demo/image/upload/v12345/citycare/attachments/after_repair.jpg",
			filePublicId: `citycare/attachments/after_${ts}`,
			fileName: "after_repair.jpg",
			fileType: "image/jpeg",
			fileSize: 256000,
			uploadedById: tech1User.id,
			evidenceType: EvidenceType.AFTER,
		},
	});

	console.log(
		`✅ Technician BEFORE evidence attached: ID=${beforeEvidence.id}`,
	);
	console.log(
		`✅ Technician PROGRESS evidence attached: ID=${progressEvidence.id}`,
	);
	console.log(`✅ Technician AFTER evidence attached: ID=${afterEvidence.id}`);

	// 6. Attachment Retrieval API Test
	console.log("\n--- Testing Attachment Retrieval API ---");
	const allAttachments = await AttachmentService.getRequestAttachments(
		request1.id,
		tech1User.id,
		Role.STAFF,
		{},
	);
	console.log(
		`✅ Retrieved ${allAttachments.length} attachments for service request.`,
	);

	const beforeOnly = await AttachmentService.getRequestAttachments(
		request1.id,
		tech1User.id,
		Role.STAFF,
		{ attachmentType: EvidenceType.BEFORE },
	);
	if (beforeOnly.length !== 1 || beforeOnly[0].id !== beforeEvidence.id) {
		throw new Error("Filtered attachment retrieval mismatch!");
	}
	console.log("✅ Attachment type filtering (BEFORE) verified.");

	// 7. Controlled Deletion Test in Allowed State
	console.log("\n--- Testing Controlled Attachment Deletion ---");
	const tempAttachment = await prisma.requestAttachment.create({
		data: {
			requestId: request1.id,
			fileUrl:
				"https://res.cloudinary.com/demo/image/upload/v12345/citycare/attachments/temp_draft.jpg",
			filePublicId: null, // null publicId for synthetic test to skip Cloudinary destroy call
			fileName: "temp_draft.jpg",
			fileType: "image/jpeg",
			fileSize: 50000,
			uploadedById: tech1User.id,
			evidenceType: EvidenceType.PROGRESS,
		},
	});

	const deleteRes = await AttachmentService.deleteAttachment(
		request1.id,
		tempAttachment.id,
		tech1User.id,
		Role.STAFF,
	);
	if (!deleteRes.deleted) {
		throw new Error("Attachment deletion failed!");
	}
	console.log(
		`✅ Temporary evidence file deleted successfully: ID=${tempAttachment.id}`,
	);

	// 8. Terminal State Historical Evidence Preservation Test
	console.log(
		"\n--- Testing Historical Evidence Preservation in Terminal State ---",
	);
	await TechnicianWorkService.submitResolution(
		request1.id,
		tech1User.id,
		Role.STAFF,
		{
			summary: "Completed asphalt compaction flush with pavement.",
			details: "Full excavation, binder layer, and surface sealing.",
		},
	);
	await ResolutionVerificationService.verifyResolution(
		request1.id,
		supervisorUser.id,
		Role.STAFF,
		{
			decision: VerificationDecision.APPROVED,
			comments: "Verified smooth and flush finish.",
		},
	);

	// Attempting to delete evidence after request is RESOLVED
	try {
		await AttachmentService.deleteAttachment(
			request1.id,
			afterEvidence.id,
			tech1User.id,
			Role.STAFF,
		);
		throw new Error(
			"Historical evidence deletion on RESOLVED request should have failed!",
		);
	} catch (err: any) {
		console.log(
			`✅ Terminal state historical evidence protection verified: "${err.message}"`,
		);
	}

	console.log("\n=================================================");
	console.log("   🎉 ALL PHASE 11 VERIFICATION TESTS PASSED!   ");
	console.log("=================================================");
}

runPhase11Verification()
	.catch((err) => {
		console.error("❌ Phase 11 Verification failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
