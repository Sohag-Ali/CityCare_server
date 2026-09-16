import { prisma } from "./app/lib/prisma";
import { AssignmentService } from "./app/module/assignment/assignment.service";
import { CategoryService } from "./app/module/category/category.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";
import { TechnicianWorkService } from "./app/module/technicianWork/technicianWork.service";
import {
	AssignmentStatus,
	EvidenceType,
	RequestStatus,
	Role,
	ServicePriority,
	StaffType,
	UserStatus,
} from "./generated/prisma/client";

async function runPhase9Verification() {
	console.log("==========================================");
	console.log("   STARTING PHASE 9 VERIFICATION SUITE   ");
	console.log("==========================================");

	const ts = Date.now();

	// 1. Setup Infrastructure
	const municipality = await prisma.municipality.create({
		data: {
			name: `Phase9 DNCC-${ts}`,
			code: `P9-DNCC-${ts}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `P9 Zone 1-${ts}`,
			code: `P9Z1-${ts}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `P9 Ward 10-${ts}`,
			code: `P9W10-${ts}`,
			wardNumber: 10,
		},
	});

	const roadsDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P9 Roads Dept-${ts}`,
			code: `P9ROAD-${ts}`,
		},
	});

	const category = await CategoryService.createCategory({
		departmentId: roadsDept.id,
		name: `P9 Road Repair-${ts}`,
		code: `P9RR-${ts}`,
	});

	const service = await ServiceService.createService({
		categoryId: category.id,
		name: `P9 Pothole Maintenance-${ts}`,
		code: `P9PM-${ts}`,
	});

	// Citizen User
	const citizenUser = await prisma.user.create({
		data: {
			name: `P9 Citizen-${ts}`,
			email: `p9citizen-${ts}@citycare.gov.bd`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});
	const citizen = await prisma.citizen.create({
		data: {
			userId: citizenUser.id,
			address: "456 Avenue",
		},
	});

	// Manager User (Roads Dept)
	const managerUser = await prisma.user.create({
		data: {
			name: `P9 Manager Roads-${ts}`,
			email: `p9manager-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: managerUser.id,
			employeeId: `EMP-P9MGR-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.MANAGER,
			designation: "Roads Manager",
			joiningDate: new Date(),
		},
	});

	// Technician 1 User (Assigned Tech)
	const tech1User = await prisma.user.create({
		data: {
			name: `P9 Tech 1 Roads-${ts}`,
			email: `p9tech1-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const tech1Staff = await prisma.staffProfile.create({
		data: {
			userId: tech1User.id,
			employeeId: `EMP-P9TECH1-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Asphalt Specialist",
			joiningDate: new Date(),
		},
	});

	// Technician 2 User (Unassigned Tech)
	const tech2User = await prisma.user.create({
		data: {
			name: `P9 Tech 2 Roads-${ts}`,
			email: `p9tech2-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: tech2User.id,
			employeeId: `EMP-P9TECH2-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Assistant Inspector",
			joiningDate: new Date(),
		},
	});

	console.log(
		"✔ Phase 9 test infrastructure and accounts created successfully.",
	);

	// ==================================================
	// TEST 1: Create Request, Approve, Assign, Accept
	// ==================================================
	console.log(
		"\n[TEST 1] Creating request and moving through APPROVED -> ASSIGNED -> ACCEPTED...",
	);
	const req1 = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Large Pothole near Central Square",
			description: "Deep crater causing traffic hazard.",
			priority: ServicePriority.HIGH,
			location: {
				wardId: ward.id,
				address: "Central Square South Lane",
			},
		},
	);

	await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.UNDER_REVIEW, note: "Verified complaint" },
	);
	await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.APPROVED, note: "Approved for work" },
	);

	const assignRes = await AssignmentService.assignTechnician(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ technicianId: tech1Staff.id, note: "High priority road fix" },
	);

	const acceptRes = await AssignmentService.acceptAssignment(
		assignRes.assignment.id,
		tech1User.id,
		{ note: "En route to central square site" },
	);

	if (acceptRes.serviceRequest.status !== RequestStatus.ACCEPTED) {
		throw new Error("Request status failed to reach ACCEPTED state!");
	}
	console.log("✔ Test 1 passed: Request is ACCEPTED by Technician 1.");

	// ==================================================
	// TEST 2: Start Work (ACCEPTED -> IN_PROGRESS)
	// ==================================================
	console.log("\n[TEST 2] Technician 1 starting work on request...");
	const startRes = await TechnicianWorkService.startWork(
		req1.id,
		tech1User.id,
		Role.STAFF,
		"Commenced machinery operation and excavation.",
	);

	if (startRes.serviceRequest.status !== RequestStatus.IN_PROGRESS) {
		throw new Error(
			"Request status should be IN_PROGRESS after starting work!",
		);
	}

	// Verify status history
	const history = await prisma.requestStatusHistory.findFirst({
		where: {
			requestId: req1.id,
			fromStatus: RequestStatus.ACCEPTED,
			toStatus: RequestStatus.IN_PROGRESS,
		},
	});
	if (!history) {
		throw new Error(
			"Status history record missing for ACCEPTED -> IN_PROGRESS transition!",
		);
	}
	console.log(
		"✔ Test 2 passed: Work execution started successfully (ACCEPTED -> IN_PROGRESS).",
	);

	// ==================================================
	// TEST 3: Reject Unassigned Technician Action
	// ==================================================
	console.log(
		"\n[TEST 3] Testing unassigned Technician 2 attempting action on Tech 1's request...",
	);
	try {
		await TechnicianWorkService.createTechnicianUpdate(
			req1.id,
			tech2User.id,
			Role.STAFF,
			{ message: "Impersonated update attempt", progressPercentage: 20 },
		);
		throw new Error("Unassigned technician update should have failed!");
	} catch (err: any) {
		if (err.message.includes("not actively assigned")) {
			console.log(
				`✔ Unassigned technician rejection verified: "${err.message}"`,
			);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 4: Reject Citizen / Officer Attempting Technician Actions
	// ==================================================
	console.log(
		"\n[TEST 4] Testing Citizen and Manager attempting technician-only actions...",
	);
	try {
		await TechnicianWorkService.startWork(
			req1.id,
			citizenUser.id,
			Role.CITIZEN,
		);
		throw new Error("Citizen starting work should have failed!");
	} catch (err: any) {
		if (err.message.includes("Only staff technicians")) {
			console.log(`✔ Citizen rejection verified: "${err.message}"`);
		} else {
			throw err;
		}
	}

	try {
		await TechnicianWorkService.submitResolution(
			req1.id,
			managerUser.id,
			Role.STAFF,
			{
				summary: "Illegal manager resolution",
				details: "Manager bypass",
			},
		);
		throw new Error("Manager submitting resolution should have failed!");
	} catch (err: any) {
		if (err.message.includes("not a registered technician profile")) {
			console.log(
				`✔ Non-technician staff resolution rejection verified: "${err.message}"`,
			);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 5: Work Updates & Progress Progression (30%, 60%, 100%)
	// ==================================================
	console.log("\n[TEST 5] Technician 1 adding 30% and 60% progress updates...");
	const update1 = await TechnicianWorkService.createTechnicianUpdate(
		req1.id,
		tech1User.id,
		Role.STAFF,
		{ message: "Initial site inspection completed.", progressPercentage: 30 },
	);
	if (update1.progressPercentage !== 30) {
		throw new Error("Progress percentage 30 not saved correctly!");
	}

	const update2 = await TechnicianWorkService.createTechnicianUpdate(
		req1.id,
		tech1User.id,
		Role.STAFF,
		{ message: "Road excavation completed.", progressPercentage: 60 },
	);
	if (update2.progressPercentage !== 60) {
		throw new Error("Progress percentage 60 not saved correctly!");
	}

	// Reject progress decrease (attempt 40% after 60%)
	console.log(
		"-> Testing progress percentage decrease rejection (attempting 40% after 60%)...",
	);
	try {
		await TechnicianWorkService.createTechnicianUpdate(
			req1.id,
			tech1User.id,
			Role.STAFF,
			{ message: "Invalid backward progress", progressPercentage: 40 },
		);
		throw new Error("Progress decrease should have been rejected!");
	} catch (err: any) {
		if (err.message.includes("cannot decrease")) {
			console.log(
				`✔ Progress decrease error caught as expected: "${err.message}"`,
			);
		} else {
			throw err;
		}
	}

	// Add 100% progress update
	console.log("-> Adding 100% progress update...");
	await TechnicianWorkService.createTechnicianUpdate(
		req1.id,
		tech1User.id,
		Role.STAFF,
		{ message: "Asphalt resurfacing completed.", progressPercentage: 100 },
	);

	// Verify status remains IN_PROGRESS (100% does not auto-resolve)
	const currentReqState = await prisma.serviceRequest.findUnique({
		where: { id: req1.id },
	});
	if (currentReqState?.status !== RequestStatus.IN_PROGRESS) {
		throw new Error("100% progress update should NOT auto-resolve request!");
	}
	console.log(
		"✔ Test 5 passed: Progress updates logged and non-decreasing validation enforced.",
	);

	// ==================================================
	// TEST 6: Standalone Evidence Photo Upload Test (Validation)
	// ==================================================
	console.log("\n[TEST 6] Testing standalone evidence photo validation...");
	try {
		await TechnicianWorkService.uploadEvidence(
			req1.id,
			tech1User.id,
			Role.STAFF,
			EvidenceType.PROGRESS,
			[],
		);
		throw new Error("Empty files upload should have failed!");
	} catch (err: any) {
		if (err.message.includes("At least one evidence photo file is required")) {
			console.log(
				`✔ Empty evidence photo validation caught as expected: "${err.message}"`,
			);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 7: Submit Resolution (IN_PROGRESS -> RESOLUTION_SUBMITTED)
	// ==================================================
	console.log("\n[TEST 7] Submitting final work resolution...");
	const resResult = await TechnicianWorkService.submitResolution(
		req1.id,
		tech1User.id,
		Role.STAFF,
		{
			summary: "Central Square Pothole Fully Repaired",
			details: "Asphalt layer refilled, leveled, and compacted. Site cleaned.",
			evidenceType: EvidenceType.AFTER,
		},
	);

	if (resResult.serviceRequest.status !== RequestStatus.RESOLUTION_SUBMITTED) {
		throw new Error("Request status should be RESOLUTION_SUBMITTED!");
	}
	if (!resResult.resolution.summary.includes("Fully Repaired")) {
		throw new Error("Resolution summary mismatch!");
	}
	console.log(
		"✔ Test 7 passed: Resolution submitted and request transitioned to RESOLUTION_SUBMITTED.",
	);

	// ==================================================
	// TEST 8: Reject Duplicate Resolution Submission
	// ==================================================
	console.log(
		"\n[TEST 8] Testing resolution resubmission on non-IN_PROGRESS request...",
	);
	try {
		await TechnicianWorkService.submitResolution(
			req1.id,
			tech1User.id,
			Role.STAFF,
			{ summary: "Duplicate resolution", details: "Should fail" },
		);
		throw new Error(
			"Resubmitting resolution should fail when status is not IN_PROGRESS!",
		);
	} catch (err: any) {
		if (err.message.includes("only be submitted when request is IN_PROGRESS")) {
			console.log(
				`✔ Resolution duplicate submission error caught as expected: "${err.message}"`,
			);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 9: Timeline Verification
	// ==================================================
	console.log("\n[TEST 9] Verifying complete Service Request timeline view...");
	const timelineView = await ServiceRequestService.getServiceRequestById(
		req1.id,
		Role.STAFF,
		managerUser.id,
	);

	const srAny = timelineView as any;
	console.log(`-> Status History records: ${srAny.statusHistory?.length}`);
	console.log(`-> Assignments records: ${srAny.assignments?.length}`);
	console.log(
		`-> Technician Updates records: ${srAny.technicianUpdates?.length}`,
	);
	console.log(`-> Resolution records: ${srAny.resolutions?.length}`);

	if (!srAny.technicianUpdates || srAny.technicianUpdates.length < 3) {
		throw new Error("Timeline missing technician updates!");
	}
	if (!srAny.resolutions || srAny.resolutions.length < 1) {
		throw new Error("Timeline missing resolution record!");
	}
	console.log(
		"✔ Test 9 passed: Request timeline view correctly contains all execution history.",
	);

	console.log("\n==========================================");
	console.log("   🎉 ALL PHASE 9 VERIFICATION TESTS PASSED!");
	console.log("==========================================");
}

runPhase9Verification()
	.catch((err) => {
		console.error("\n❌ PHASE 9 VERIFICATION FAILED:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
