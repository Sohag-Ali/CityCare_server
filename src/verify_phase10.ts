import { prisma } from "./app/lib/prisma";
import { AssignmentService } from "./app/module/assignment/assignment.service";
import { CategoryService } from "./app/module/category/category.service";
import { ResolutionVerificationService } from "./app/module/resolutionVerification/resolutionVerification.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";
import { SlaService } from "./app/module/sla/sla.service";
import { TechnicianWorkService } from "./app/module/technicianWork/technicianWork.service";
import {
	AssignmentStatus,
	EscalationStatus,
	RequestStatus,
	Role,
	ServicePriority,
	SlaEventType,
	StaffType,
	UserStatus,
	VerificationDecision,
} from "./generated/prisma/client";

async function runPhase10Verification() {
	console.log("=================================================");
	console.log("   STARTING PHASE 10 VERIFICATION SUITE         ");
	console.log("=================================================");

	const ts = Date.now();

	// 1. Setup Infrastructure
	const municipality = await prisma.municipality.create({
		data: {
			name: `Phase10 DNCC-${ts}`,
			code: `P10-DNCC-${ts}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `P10 Zone 1-${ts}`,
			code: `P10Z1-${ts}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `P10 Ward 10-${ts}`,
			code: `P10W10-${ts}`,
			wardNumber: 10,
		},
	});

	const roadsDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P10 Roads Dept-${ts}`,
			code: `P10ROAD-${ts}`,
		},
	});

	const category = await CategoryService.createCategory({
		departmentId: roadsDept.id,
		name: `Road Repair P10-${ts}`,
		code: `RR-P10-${ts}`,
	});

	const service = await ServiceService.createService({
		categoryId: category.id,
		name: `Pothole Repair P10-${ts}`,
		code: `PR-P10-${ts}`,
	});

	// Admin User
	const adminUser = await prisma.user.create({
		data: {
			name: `P10 Admin-${ts}`,
			email: `admin.p10.${ts}@example.com`,
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
		},
	});

	// Citizen User
	const citizenUser = await prisma.user.create({
		data: {
			name: `P10 Citizen-${ts}`,
			email: `citizen.p10.${ts}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});
	const citizen = await prisma.citizen.create({
		data: {
			userId: citizenUser.id,
			address: "123 Main Street",
		},
	});

	// Technician User & Staff Profile
	const techUser = await prisma.user.create({
		data: {
			name: `P10 Technician User-${ts}`,
			email: `tech.p10.${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const techStaff = await prisma.staffProfile.create({
		data: {
			userId: techUser.id,
			employeeId: `EMP-P10TECH-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Senior Field Tech",
			joiningDate: new Date(),
		},
	});

	// Supervisor User & Staff Profile (Manager/Department Head)
	const supervisorUser = await prisma.user.create({
		data: {
			name: `P10 Supervisor User-${ts}`,
			email: `supervisor.p10.${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const supervisorStaff = await prisma.staffProfile.create({
		data: {
			userId: supervisorUser.id,
			employeeId: `EMP-P10MGR-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.MANAGER,
			designation: "Roads Manager",
			joiningDate: new Date(),
		},
	});

	console.log("✅ 1. Setup completed cleanly.");

	// 2. SLA Policy Configuration & Querying
	console.log("\n--- Testing SLA Policy Management ---");
	const policyCountBefore = (await SlaService.getAllPolicies()).length;

	// Note: default URGENT policy or custom creation
	const urgentPolicy = await SlaService.getSlaPolicyForPriority(
		ServicePriority.URGENT,
	);
	console.log(
		`✅ SLA Policy lookup for URGENT priority: Response ${urgentPolicy.responseTimeMinutes}m, Resolution ${urgentPolicy.resolutionTimeMinutes}m`,
	);

	// 3. Service Request Creation with SLA Snapshotting
	console.log("\n--- Testing SLA Snapshotting on Service Request Creation ---");
	const request1 = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Large Pothole near Sector 3",
			description: "Pothole causing traffic hazards",
			priority: ServicePriority.URGENT,
			location: {
				wardId: ward.id,
				address: "Road 4, Sector 3",
			},
		},
	);

	if (!request1.responseDueAt || !request1.resolutionDueAt) {
		throw new Error(
			"SLA due dates were not snapshot on Service Request creation!",
		);
	}

	const responseDiffMinutes = Math.round(
		(request1.responseDueAt.getTime() - request1.createdAt.getTime()) /
			(1000 * 60),
	);
	const resolutionDiffMinutes = Math.round(
		(request1.resolutionDueAt.getTime() - request1.createdAt.getTime()) /
			(1000 * 60),
	);

	console.log(
		`✅ Service Request SLA Snapshot: responseDueAt +${responseDiffMinutes}m (Expected 30m for URGENT), resolutionDueAt +${resolutionDiffMinutes}m (Expected 240m for URGENT)`,
	);

	const slaStatus1 = await SlaService.checkSlaStatus(
		request1.id,
		adminUser.id,
		Role.ADMIN,
	);
	console.log(
		`✅ Initial SLA Status: ${slaStatus1.status}, isResponseBreached=${slaStatus1.isResponseBreached}, isResolutionBreached=${slaStatus1.isResolutionBreached}`,
	);

	// 4. Status Progression & Assignment
	console.log("\n--- Testing Status Progression, Assignment & Start Work ---");
	await ServiceRequestService.updateServiceRequestStatus(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ status: RequestStatus.UNDER_REVIEW, note: "Reviewing" },
	);
	await ServiceRequestService.updateServiceRequestStatus(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ status: RequestStatus.APPROVED, note: "Approved" },
	);

	const assignRes = await AssignmentService.assignTechnician(
		request1.id,
		Role.STAFF,
		supervisorUser.id,
		{ technicianId: techStaff.id, note: "Assigning field tech" },
	);

	await AssignmentService.acceptAssignment(
		assignRes.assignment.id,
		techUser.id,
		{
			note: "Accepted work",
		},
	);

	const startRes = await TechnicianWorkService.startWork(
		request1.id,
		techUser.id,
		Role.STAFF,
		"Commenced pothole repair",
	);

	if (!startRes.serviceRequest.responseStartedAt) {
		throw new Error("responseStartedAt was not recorded on starting work!");
	}
	console.log(
		"✅ Response SLA completed (responseStartedAt set). Request Status: IN_PROGRESS",
	);

	// 5. Submit Resolution
	console.log("\n--- Testing Resolution Submission ---");
	const resSubmit = await TechnicianWorkService.submitResolution(
		request1.id,
		techUser.id,
		Role.STAFF,
		{
			summary: "Pothole filled with cold asphalt mix.",
			details:
				"Excavated loose gravel, laid asphalt layer, compacted using plate tamper.",
		},
	);
	console.log(
		`✅ Resolution submitted. Request Status: ${resSubmit.serviceRequest.status}`,
	);

	// 6. Test Technician Verification Prevention
	console.log("\n--- Testing Technician Self-Verification Prevention ---");
	try {
		await ResolutionVerificationService.verifyResolution(
			request1.id,
			techUser.id,
			Role.STAFF,
			{
				decision: VerificationDecision.APPROVED,
				comments: "I approve my own work",
			},
		);
		throw new Error("Technician verification should have failed but passed!");
	} catch (err: any) {
		console.log(
			`✅ Technician verification successfully rejected: "${err.message}"`,
		);
	}

	// 7. Verification - Case A: Rework Required
	console.log("\n--- Testing Resolution Verification: REWORK_REQUIRED ---");
	const reworkVerification =
		await ResolutionVerificationService.verifyResolution(
			request1.id,
			supervisorUser.id,
			Role.STAFF,
			{
				decision: VerificationDecision.REWORK_REQUIRED,
				comments: "Asphalt layer is uneven and needs further compaction.",
			},
		);

	if (reworkVerification.serviceRequest.status !== RequestStatus.IN_PROGRESS) {
		throw new Error(
			`Expected status IN_PROGRESS on rework, got ${reworkVerification.serviceRequest.status}`,
		);
	}

	const activeAssignmentAfterRework = await prisma.assignment.findFirst({
		where: { serviceRequestId: request1.id },
		orderBy: { createdAt: "desc" },
	});
	if (
		!activeAssignmentAfterRework ||
		!activeAssignmentAfterRework.notes?.includes("REWORK REQUIRED")
	) {
		throw new Error(
			"Active assignment rework status was not updated properly!",
		);
	}

	console.log(
		`✅ Verification decision REWORK_REQUIRED applied. Request returned to IN_PROGRESS. Assignment rework note: "${activeAssignmentAfterRework.notes}"`,
	);

	// 8. Resubmit Resolution & Approve
	console.log("\n--- Testing Resubmission & Approval ---");
	await TechnicianWorkService.submitResolution(
		request1.id,
		techUser.id,
		Role.STAFF,
		{
			summary: "Re-compacted asphalt and smoothed edges.",
			details:
				"Used heavy roller to ensure flush finish with existing pavement.",
		},
	);

	const approvalVerification =
		await ResolutionVerificationService.verifyResolution(
			request1.id,
			supervisorUser.id,
			Role.STAFF,
			{
				decision: VerificationDecision.APPROVED,
				comments: "Pothole repair verified as flush and smooth. Great job.",
				qualityRating: 5,
			},
		);

	if (approvalVerification.serviceRequest.status !== RequestStatus.RESOLVED) {
		throw new Error(
			`Expected status RESOLVED on approval, got ${approvalVerification.serviceRequest.status}`,
		);
	}
	if (!approvalVerification.serviceRequest.resolutionCompletedAt) {
		throw new Error("resolutionCompletedAt was not set on approval!");
	}

	console.log(
		`✅ Verification decision APPROVED applied. Request Status: RESOLVED. resolutionCompletedAt recorded at ${approvalVerification.serviceRequest.resolutionCompletedAt.toISOString()}`,
	);

	// 9. SLA Breach & Escalation Evaluation Test
	console.log("\n--- Testing SLA Breach Evaluation & Escalation ---");
	// Create an overdue service request intentionally
	const overdueReq = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Broken Streetlight Urgent",
			description: "Dark street corner at night",
			priority: ServicePriority.URGENT,
			location: {
				wardId: ward.id,
				address: "Road 12, Ward 10",
			},
		},
	);

	// Manually backdate resolutionDueAt to the past
	const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
	await prisma.serviceRequest.update({
		where: { id: overdueReq.id },
		data: { resolutionDueAt: pastDate },
	});

	const overdueSlaStatus = await SlaService.checkSlaStatus(
		overdueReq.id,
		adminUser.id,
		Role.ADMIN,
	);
	if (
		overdueSlaStatus.status !== "BREACHED" ||
		!overdueSlaStatus.isResolutionBreached
	) {
		throw new Error(
			`Expected SLA status to be BREACHED, got status=${overdueSlaStatus.status}, isResolutionBreached=${overdueSlaStatus.isResolutionBreached}`,
		);
	}

	const loggedEvents: any[] = overdueSlaStatus.events as any[];
	const loggedEscalations: any[] = overdueSlaStatus.escalations as any[];

	if (
		loggedEvents.length === 0 ||
		loggedEvents[0].type !== SlaEventType.BREACH
	) {
		throw new Error("SlaEvent for BREACH was not created!");
	}
	if (
		loggedEscalations.length === 0 ||
		loggedEscalations[0].status !== EscalationStatus.OPEN
	) {
		throw new Error("Escalation record was not created for SLA breach!");
	}

	console.log(
		`✅ SLA Breach Verified: status=${overdueSlaStatus.status}, Logged Event=${loggedEvents[0].type}, Logged Escalation trigger=${loggedEscalations[0].trigger}, status=${loggedEscalations[0].status}`,
	);

	console.log("\n=================================================");
	console.log("   🎉 ALL PHASE 10 VERIFICATION TESTS PASSED!   ");
	console.log("=================================================");
}

runPhase10Verification()
	.catch((err) => {
		console.error("❌ Phase 10 Verification failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
