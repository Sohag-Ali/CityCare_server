import {
	AssignmentStatus,
	RequestStatus,
	Role,
	ServicePriority,
	StaffType,
	UserStatus,
} from "./generated/prisma/client";
import { prisma } from "./app/lib/prisma";
import { AssignmentService } from "./app/module/assignment/assignment.service";
import { CategoryService } from "./app/module/category/category.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";

async function runPhase8Verification() {
	console.log("==========================================");
	console.log("   STARTING PHASE 8 VERIFICATION SUITE   ");
	console.log("==========================================");

	const ts = Date.now();

	// 1. Setup Infrastructure
	const municipality = await prisma.municipality.create({
		data: {
			name: `Phase8 DNCC-${ts}`,
			code: `P8-DNCC-${ts}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `P8 Zone 1-${ts}`,
			code: `P8Z1-${ts}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `P8 Ward 10-${ts}`,
			code: `P8W10-${ts}`,
			wardNumber: 10,
		},
	});

	// Sanitation Dept (Primary) & Roads Dept (Secondary)
	const sanitationDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P8 Sanitation Dept-${ts}`,
			code: `P8SAN-${ts}`,
		},
	});

	const roadsDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P8 Roads Dept-${ts}`,
			code: `P8ROAD-${ts}`,
		},
	});

	// Service under Sanitation Dept
	const category = await CategoryService.createCategory({
		departmentId: sanitationDept.id,
		name: `P8 Waste Management-${ts}`,
		code: `P8WM-${ts}`,
	});

	const service = await ServiceService.createService({
		categoryId: category.id,
		name: `P8 Garbage Collection-${ts}`,
		code: `P8GC-${ts}`,
		serviceType: "COMPLAINT",
	});

	// Citizen User
	const citizenUser = await prisma.user.create({
		data: {
			name: `P8 Citizen-${ts}`,
			email: `p8citizen-${ts}@citycare.gov.bd`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});
	const citizen = await prisma.citizen.create({
		data: {
			userId: citizenUser.id,
			address: "123 Citizen Lane",
		},
	});

	// Manager User (Sanitation Dept)
	const managerUser = await prisma.user.create({
		data: {
			name: `P8 Manager Sanitation-${ts}`,
			email: `p8manager-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const managerStaff = await prisma.staffProfile.create({
		data: {
			userId: managerUser.id,
			employeeId: `EMP-MGR-${ts}`,
			departmentId: sanitationDept.id,
			staffType: StaffType.MANAGER,
			designation: "Sanitation Manager",
			joiningDate: new Date(),
		},
	});

	// Technician 1 User (Sanitation Dept)
	const tech1User = await prisma.user.create({
		data: {
			name: `P8 Tech 1 Sanitation-${ts}`,
			email: `p8tech1-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const tech1Staff = await prisma.staffProfile.create({
		data: {
			userId: tech1User.id,
			employeeId: `EMP-TECH1-${ts}`,
			departmentId: sanitationDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Field Technician I",
			joiningDate: new Date(),
		},
	});

	// Technician 2 User (Sanitation Dept)
	const tech2User = await prisma.user.create({
		data: {
			name: `P8 Tech 2 Sanitation-${ts}`,
			email: `p8tech2-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const tech2Staff = await prisma.staffProfile.create({
		data: {
			userId: tech2User.id,
			employeeId: `EMP-TECH2-${ts}`,
			departmentId: sanitationDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Field Technician II",
			joiningDate: new Date(),
		},
	});

	// Technician 3 User (Roads Dept - wrong dept)
	const tech3RoadsUser = await prisma.user.create({
		data: {
			name: `P8 Tech 3 Roads-${ts}`,
			email: `p8tech3-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const tech3RoadsStaff = await prisma.staffProfile.create({
		data: {
			userId: tech3RoadsUser.id,
			employeeId: `EMP-TECH3-${ts}`,
			departmentId: roadsDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Roads Specialist",
			joiningDate: new Date(),
		},
	});

	// Inactive Technician User (Sanitation Dept)
	const inactiveTechUser = await prisma.user.create({
		data: {
			name: `P8 Inactive Tech-${ts}`,
			email: `p8inactivetech-${ts}@citycare.gov.bd`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	const inactiveTechStaff = await prisma.staffProfile.create({
		data: {
			userId: inactiveTechUser.id,
			employeeId: `EMP-INACTIVE-${ts}`,
			departmentId: sanitationDept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Suspended Inspector",
			joiningDate: new Date(),
			isActive: false,
		},
	});

	console.log("✔ Infrastructure and user accounts initialized successfully.");

	// ==================================================
	// TEST 1: Get Eligible Technicians & Department Scoping
	// ==================================================
	console.log("\n[TEST 1] Querying eligible technicians for Manager (Sanitation Dept)...");
	const eligibleTechs = await AssignmentService.getEligibleTechnicians(
		managerUser.id,
		Role.STAFF,
		{},
	);

	console.log(`-> Eligible technicians found: ${eligibleTechs.length}`);
	const techIds = eligibleTechs.map((t) => t.id);
	if (!techIds.includes(tech1Staff.id) || !techIds.includes(tech2Staff.id)) {
		throw new Error("Sanitation technicians missing from eligible list!");
	}
	if (techIds.includes(tech3RoadsStaff.id)) {
		throw new Error("Roads technician wrongly returned for Sanitation Manager!");
	}
	if (techIds.includes(inactiveTechStaff.id)) {
		throw new Error("Inactive technician wrongly returned in eligible list!");
	}
	console.log("✔ Test 1 passed: Department-scoped eligible technician list verified.");

	// ==================================================
	// TEST 2: Submit Request & Move to APPROVED State
	// ==================================================
	console.log("\n[TEST 2] Submitting ServiceRequest and advancing status to APPROVED...");
	const req1 = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Overflowing Garbage Container",
			description: "Container has not been cleared for 3 days near Market Road.",
			priority: ServicePriority.HIGH,
			location: {
				wardId: ward.id,
				address: "Market Road Crossing",
			},
		},
	);

	// Move SUBMITTED -> UNDER_REVIEW -> APPROVED
	await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.UNDER_REVIEW, note: "Initial review passed" },
	);
	const approvedReq1 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.APPROVED, note: "Request approved for dispatch" },
	);

	if (approvedReq1.status !== RequestStatus.APPROVED) {
		throw new Error("Request failed to transition to APPROVED state!");
	}
	console.log("✔ Test 2 passed: ServiceRequest status is APPROVED.");

	// ==================================================
	// TEST 3: Assign Active Technician
	// ==================================================
	console.log("\n[TEST 3] Assigning active Sanitation Technician 1...");
	const assignRes1 = await AssignmentService.assignTechnician(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{
			technicianId: tech1Staff.id,
			note: "Proceed immediately for container clearance.",
		},
	);

	if (assignRes1.assignment.status !== AssignmentStatus.ACTIVE) {
		throw new Error("Assignment status should be ACTIVE!");
	}
	if (assignRes1.serviceRequest.status !== RequestStatus.ASSIGNED) {
		throw new Error("ServiceRequest status should be ASSIGNED!");
	}
	console.log("✔ Test 3 passed: Request assigned to Technician 1 successfully.");

	// ==================================================
	// TEST 4: Workload Count Check
	// ==================================================
	console.log("\n[TEST 4] Checking technician workload count after assignment...");
	const techWorkloadList = await AssignmentService.getEligibleTechnicians(
		managerUser.id,
		Role.STAFF,
		{},
	);
	const tech1Workload = techWorkloadList.find((t) => t.id === tech1Staff.id);
	if (tech1Workload?.activeAssignmentsCount !== 1) {
		throw new Error(
			`Expected Tech 1 activeAssignmentsCount to be 1, got ${tech1Workload?.activeAssignmentsCount}`,
		);
	}
	console.log("✔ Test 4 passed: Active workload count correctly updated to 1.");

	// ==================================================
	// TEST 5: Reject Cross-Department Assignment
	// ==================================================
	console.log("\n[TEST 5] Testing cross-department assignment rejection...");
	try {
		await AssignmentService.assignTechnician(
			req1.id,
			Role.STAFF,
			managerUser.id,
			{
				technicianId: tech3RoadsStaff.id, // Roads dept technician
				note: "Attempt cross dept assignment",
			},
		);
		throw new Error("Cross-department assignment should have thrown an error!");
	} catch (err: any) {
		if (err.message.includes("does not belong to the department")) {
			console.log(`✔ Cross-department error caught as expected: "${err.message}"`);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 6: Reject Non-Technician Assignment
	// ==================================================
	console.log("\n[TEST 6] Testing non-technician assignment rejection...");
	try {
		await AssignmentService.assignTechnician(
			req1.id,
			Role.STAFF,
			managerUser.id,
			{
				technicianId: managerStaff.id, // Manager profile, not technician
				note: "Assign to manager",
			},
		);
		throw new Error("Non-technician assignment should have failed!");
	} catch (err: any) {
		if (err.message.includes("is not a technician")) {
			console.log(`✔ Non-technician error caught as expected: "${err.message}"`);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 7: Reject Inactive Technician Assignment
	// ==================================================
	console.log("\n[TEST 7] Testing inactive technician assignment rejection...");
	try {
		await AssignmentService.assignTechnician(
			req1.id,
			Role.STAFF,
			managerUser.id,
			{
				technicianId: inactiveTechStaff.id,
				note: "Assign to inactive tech",
			},
		);
		throw new Error("Inactive technician assignment should have failed!");
	} catch (err: any) {
		if (err.message.includes("inactive")) {
			console.log(`✔ Inactive technician error caught as expected: "${err.message}"`);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 8: Reject Unauthorized Technician Acceptance
	// ==================================================
	console.log("\n[TEST 8] Testing unauthorized technician acceptance rejection...");
	try {
		await AssignmentService.acceptAssignment(
			assignRes1.assignment.id,
			tech2User.id, // Tech 2 attempting to accept Tech 1's assignment
			{ note: "Impersonated acceptance" },
		);
		throw new Error("Unauthorized acceptance should have failed!");
	} catch (err: any) {
		if (err.message.includes("Only the assigned technician")) {
			console.log(`✔ Unauthorized acceptance error caught as expected: "${err.message}"`);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 9: Valid Technician Acceptance
	// ==================================================
	console.log("\n[TEST 9] Technician 1 accepting assigned work order...");
	const acceptRes = await AssignmentService.acceptAssignment(
		assignRes1.assignment.id,
		tech1User.id,
		{ note: "Equipped and heading to site" },
	);

	if (acceptRes.assignment.status !== AssignmentStatus.ACCEPTED) {
		throw new Error("Assignment status should be ACCEPTED!");
	}
	if (acceptRes.serviceRequest.status !== RequestStatus.ACCEPTED) {
		throw new Error("ServiceRequest status should be ACCEPTED!");
	}
	console.log("✔ Test 9 passed: Assignment and ServiceRequest transitioned to ACCEPTED.");

	// ==================================================
	// TEST 10: Re-assignment Flow & History Preservation
	// ==================================================
	console.log("\n[TEST 10] Testing re-assignment flow...");
	const req2 = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Blocked Drainage Pipe",
			description: "Water stagnation in Sector 4.",
			priority: ServicePriority.MEDIUM,
			location: {
				wardId: ward.id,
				address: "Sector 4 Main Road",
			},
		},
	);
	await ServiceRequestService.updateServiceRequestStatus(
		req2.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.UNDER_REVIEW },
	);
	await ServiceRequestService.updateServiceRequestStatus(
		req2.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.APPROVED },
	);

	// First assignment to Tech 1
	const firstAssign = await AssignmentService.assignTechnician(
		req2.id,
		Role.STAFF,
		managerUser.id,
		{ technicianId: tech1Staff.id, note: "Initial assignment" },
	);

	// Reassign to Tech 2
	const reassignRes = await AssignmentService.assignTechnician(
		req2.id,
		Role.STAFF,
		managerUser.id,
		{ technicianId: tech2Staff.id, note: "Tech 1 unavailable, reassigning to Tech 2" },
	);

	// Verify old assignment is RELEASED
	const oldAssignment = await prisma.assignment.findUnique({
		where: { id: firstAssign.assignment.id },
	});

	if (oldAssignment?.status !== AssignmentStatus.RELEASED) {
		throw new Error("Previous assignment status was not set to RELEASED!");
	}
	if (!oldAssignment.releasedAt) {
		throw new Error("Previous assignment releasedAt timestamp is missing!");
	}
	if (reassignRes.assignment.status !== AssignmentStatus.ACTIVE) {
		throw new Error("New assignment status is not ACTIVE!");
	}
	console.log("✔ Test 10 passed: Re-assignment safely released old record and created active new assignment.");

	// ==================================================
	// TEST 11: Reject Invalid Status Assignment
	// ==================================================
	console.log("\n[TEST 11] Testing assignment on unapproved SUBMITTED request...");
	const req3Submitted = await ServiceRequestService.createServiceRequest(
		citizenUser.id,
		{
			serviceId: service.id,
			title: "Unapproved Request",
			description: "Still in submitted state.",
			priority: ServicePriority.LOW,
			location: { wardId: ward.id, address: "Street 5" },
		},
	);

	try {
		await AssignmentService.assignTechnician(
			req3Submitted.id,
			Role.STAFF,
			managerUser.id,
			{ technicianId: tech1Staff.id },
		);
		throw new Error("Assignment on SUBMITTED request should have failed!");
	} catch (err: any) {
		if (err.message.includes("cannot be assigned")) {
			console.log(`✔ Invalid state error caught as expected: "${err.message}"`);
		} else {
			throw err;
		}
	}

	// ==================================================
	// TEST 12: Technician GET My Assignments
	// ==================================================
	console.log("\n[TEST 12] Technician querying assigned work orders...");
	const tech1MyAssignments = await AssignmentService.getMyAssignments(
		tech1User.id,
		{},
	);
	console.log(`-> Technician 1 has ${tech1MyAssignments.length} total assignment history records.`);
	if (tech1MyAssignments.length < 2) {
		throw new Error("Technician 1 should have at least 2 assignment history records!");
	}
	console.log("✔ Test 12 passed: Technician successfully retrieved work order history.");

	console.log("\n==========================================");
	console.log("   🎉 ALL PHASE 8 VERIFICATION TESTS PASSED!");
	console.log("==========================================");
}

runPhase8Verification()
	.catch((err) => {
		console.error("\n❌ PHASE 8 VERIFICATION FAILED:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
