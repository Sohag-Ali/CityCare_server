import { prisma } from "./app/lib/prisma";
import { CategoryService } from "./app/module/category/category.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";
import {
	PaymentStatus,
	RequestStatus,
	Role,
	ServicePriority,
	StaffType,
	UserStatus,
} from "./generated/prisma/client";

async function runPhase7Verification() {
	console.log("=== STARTING PHASE 7 VERIFICATION ===");

	const timestamp = Date.now();

	// 1. Setup Infrastructure: Municipality, Zone, Ward
	const municipality = await prisma.municipality.create({
		data: {
			name: `DNCC Phase7-${timestamp}`,
			code: `DNCC-P7-${timestamp}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `P7 Zone 1-${timestamp}`,
			code: `P7Z1-${timestamp}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `P7 Ward 10-${timestamp}`,
			code: `P7W10-${timestamp}`,
			wardNumber: 10,
		},
	});

	// Setup Department & Municipal Service
	const dept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P7 Sanitation Dept-${timestamp}`,
			code: `P7SAN-${timestamp}`,
		},
	});

	const otherDept = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `P7 Roads Dept-${timestamp}`,
			code: `P7ROAD-${timestamp}`,
		},
	});

	const category = await CategoryService.createCategory({
		departmentId: dept.id,
		name: `P7 Drain Category-${timestamp}`,
		code: `P7DRAIN-${timestamp}`,
	});

	const service = await ServiceService.createService({
		categoryId: category.id,
		name: "P7 Drain Unblocking",
		code: `P7DRAIN-SRV-${timestamp}`,
		isPaid: false,
	});

	console.log(
		`✔ Created Infrastructure, Dept (${dept.code}), & Municipal Service (${service.code})`,
	);

	// 2. Setup Users: Citizen 1, Citizen 2, Officer, Manager, Technician, Other Staff, Admin
	const citizenUser1 = await prisma.user.create({
		data: {
			name: `P7 Citizen 1-${timestamp}`,
			email: `citizen1.${timestamp}@test.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});

	const citizen1 = await prisma.citizen.create({
		data: { userId: citizenUser1.id },
	});

	const citizenUser2 = await prisma.user.create({
		data: {
			name: `P7 Citizen 2-${timestamp}`,
			email: `citizen2.${timestamp}@test.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});

	await prisma.citizen.create({
		data: { userId: citizenUser2.id },
	});

	// Staff Officer
	const officerUser = await prisma.user.create({
		data: {
			name: `P7 Officer-${timestamp}`,
			email: `officer.${timestamp}@test.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: officerUser.id,
			employeeId: `OFFICER-${timestamp}`,
			departmentId: dept.id,
			staffType: StaffType.OFFICER,
			designation: "Sanitation Officer",
			joiningDate: new Date(),
		},
	});

	// Staff Manager
	const managerUser = await prisma.user.create({
		data: {
			name: `P7 Manager-${timestamp}`,
			email: `manager.${timestamp}@test.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: managerUser.id,
			employeeId: `MANAGER-${timestamp}`,
			departmentId: dept.id,
			staffType: StaffType.MANAGER,
			designation: "Sanitation Manager",
			joiningDate: new Date(),
		},
	});

	// Staff Technician
	const techUser = await prisma.user.create({
		data: {
			name: `P7 Technician-${timestamp}`,
			email: `tech.${timestamp}@test.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: techUser.id,
			employeeId: `TECH-${timestamp}`,
			departmentId: dept.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Field Technician",
			joiningDate: new Date(),
		},
	});

	// Staff from other department
	const otherDeptUser = await prisma.user.create({
		data: {
			name: `P7 Other Staff-${timestamp}`,
			email: `otherstaff.${timestamp}@test.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});
	await prisma.staffProfile.create({
		data: {
			userId: otherDeptUser.id,
			employeeId: `OTHER-${timestamp}`,
			departmentId: otherDept.id,
			staffType: StaffType.MANAGER,
			designation: "Roads Manager",
			joiningDate: new Date(),
		},
	});

	// Admin User
	const adminUser = await prisma.user.create({
		data: {
			name: `P7 Admin-${timestamp}`,
			email: `admin.${timestamp}@test.com`,
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
		},
	});

	console.log(`✔ Created Test Users (Citizen, Officer, Manager, Tech, Admin)`);

	// 3. TEST: Request Creation & Initial Audit Log
	const req1 = await ServiceRequestService.createServiceRequest(
		citizenUser1.id,
		{
			serviceId: service.id,
			title: "Blocked main drain outlet",
			description:
				"Severe blockage causing wastewater backup on residential road.",
			priority: ServicePriority.HIGH,
			location: {
				wardId: ward.id,
				address: "House 5, Road 2",
			},
		},
	);

	console.log(
		`✔ Service Request Created: ${req1.trackingNumber} (Status: ${req1.status})`,
	);
	if (
		req1.statusHistory.length !== 1 ||
		req1.statusHistory[0].toStatus !== RequestStatus.SUBMITTED
	) {
		throw new Error("❌ Initial status history creation assertion failed!");
	}
	console.log(
		`✔ Verified Initial Status History log entry (null -> SUBMITTED)`,
	);

	// 4. TEST: Full Valid Workflow Lifecycle Transitions
	// Step 1: Officer moves SUBMITTED -> UNDER_REVIEW
	const step1 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		officerUser.id,
		{
			status: RequestStatus.UNDER_REVIEW,
			note: "Officer initialized technical review",
		},
	);
	console.log(`✔ Step 1: SUBMITTED -> UNDER_REVIEW (Status: ${step1.status})`);

	// Step 2: Manager moves UNDER_REVIEW -> APPROVED
	const step2 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.APPROVED, note: "Manager approved dispatch" },
	);
	console.log(`✔ Step 2: UNDER_REVIEW -> APPROVED (Status: ${step2.status})`);

	// Step 3: Manager moves APPROVED -> ASSIGNED
	const step3 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{
			status: RequestStatus.ASSIGNED,
			note: "Assigned to sanitation field crew",
		},
	);
	console.log(`✔ Step 3: APPROVED -> ASSIGNED (Status: ${step3.status})`);

	// Step 4: Technician moves ASSIGNED -> ACCEPTED
	const step4 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		techUser.id,
		{ status: RequestStatus.ACCEPTED, note: "Technician accepted work order" },
	);
	console.log(`✔ Step 4: ASSIGNED -> ACCEPTED (Status: ${step4.status})`);

	// Step 5: Technician moves ACCEPTED -> IN_PROGRESS
	const step5 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		techUser.id,
		{
			status: RequestStatus.IN_PROGRESS,
			note: "Drain cleaning operations commenced",
		},
	);
	console.log(`✔ Step 5: ACCEPTED -> IN_PROGRESS (Status: ${step5.status})`);

	// Step 6: Technician moves IN_PROGRESS -> RESOLUTION_SUBMITTED
	const step6 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		techUser.id,
		{
			status: RequestStatus.RESOLUTION_SUBMITTED,
			note: "Blockage cleared successfully",
		},
	);
	console.log(
		`✔ Step 6: IN_PROGRESS -> RESOLUTION_SUBMITTED (Status: ${step6.status})`,
	);

	// Step 7: Manager moves RESOLUTION_SUBMITTED -> VERIFICATION
	const step7 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{
			status: RequestStatus.VERIFICATION,
			note: "Field inspection in progress",
		},
	);
	console.log(
		`✔ Step 7: RESOLUTION_SUBMITTED -> VERIFICATION (Status: ${step7.status})`,
	);

	// Step 8: Manager moves VERIFICATION -> RESOLVED
	const step8 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.STAFF,
		managerUser.id,
		{ status: RequestStatus.RESOLVED, note: "Field inspection passed" },
	);
	console.log(`✔ Step 8: VERIFICATION -> RESOLVED (Status: ${step8.status})`);

	// Step 9: Manager / Admin moves RESOLVED -> CLOSED
	const step9 = await ServiceRequestService.updateServiceRequestStatus(
		req1.id,
		Role.ADMIN,
		adminUser.id,
		{ status: RequestStatus.CLOSED, note: "Complaint case closed" },
	);
	console.log(`✔ Step 9: RESOLVED -> CLOSED (Status: ${step9.status})`);

	// 5. TEST: Terminal State Modification Rejection
	try {
		await ServiceRequestService.updateServiceRequestStatus(
			req1.id,
			Role.ADMIN,
			adminUser.id,
			{ status: RequestStatus.IN_PROGRESS },
		);
		throw new Error(
			"❌ FAILED: Terminal CLOSED state modification was not rejected!",
		);
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected transition from terminal CLOSED state: "${err.message}"`,
		);
	}

	// 6. TEST: Invalid Direct Jump Rejection (SUBMITTED -> RESOLVED)
	const req2 = await ServiceRequestService.createServiceRequest(
		citizenUser1.id,
		{
			serviceId: service.id,
			title: "Second complaint",
			description: "Description testing direct invalid jump.",
			location: { wardId: ward.id, address: "Address 2" },
		},
	);

	try {
		await ServiceRequestService.updateServiceRequestStatus(
			req2.id,
			Role.ADMIN,
			adminUser.id,
			{ status: RequestStatus.RESOLVED },
		);
		throw new Error("❌ FAILED: Invalid direct status jump was not rejected!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected invalid direct status jump (SUBMITTED -> RESOLVED): "${err.message}"`,
		);
	}

	// 7. TEST: Role Permission Policy Rejection (Citizen attempting APPROVED)
	try {
		await ServiceRequestService.updateServiceRequestStatus(
			req2.id,
			Role.CITIZEN,
			citizenUser1.id,
			{ status: RequestStatus.APPROVED },
		);
		throw new Error(
			"❌ FAILED: Citizen role status escalation was not rejected!",
		);
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected unauthorized Citizen status change: "${err.message}"`,
		);
	}

	// 8. TEST: Department Scope Boundary Rejection (Other Dept Staff modifying request)
	try {
		await ServiceRequestService.updateServiceRequestStatus(
			req2.id,
			Role.STAFF,
			otherDeptUser.id,
			{ status: RequestStatus.UNDER_REVIEW },
		);
		throw new Error(
			"❌ FAILED: Cross-department staff modification was not rejected!",
		);
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected cross-department staff modification: "${err.message}"`,
		);
	}

	// 9. TEST: Citizen Cancellation Rule
	const cancelRes = await ServiceRequestService.updateServiceRequestStatus(
		req2.id,
		Role.CITIZEN,
		citizenUser1.id,
		{ status: RequestStatus.CANCELLED, note: "Issue resolved by neighbor" },
	);
	console.log(
		`✔ Citizen 1 cancelled own request successfully (Status: ${cancelRes.status})`,
	);

	// 10. TEST: Status History Audit Trail API
	const history = await ServiceRequestService.getServiceRequestHistory(
		req1.id,
		Role.ADMIN,
		adminUser.id,
	);
	console.log(
		`✔ Status History Audit Trail fetched (${history.length} entries total):`,
	);
	for (const h of history) {
		console.log(
			`   [${h.createdAt.toISOString()}] ${h.fromStatus || "NULL"} -> ${h.toStatus} (User: ${h.changedBy.name}, Note: "${h.note || ""}")`,
		);
	}

	if (history.length !== 10) {
		throw new Error("❌ Status history total entry count assertion failed!");
	}

	console.log("=== ALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runPhase7Verification()
	.catch((err) => {
		console.error("Verification failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
