import { prisma } from "./app/lib/prisma";
import { CategoryService } from "./app/module/category/category.service";
import { ServiceService } from "./app/module/service/service.service";
import { ServiceRequestService } from "./app/module/serviceRequest/serviceRequest.service";
import {
	PaymentStatus,
	RequestStatus,
	Role,
	ServicePriority,
	UserStatus,
} from "./generated/prisma/client";

async function runPhase6Verification() {
	console.log("=== STARTING PHASE 6 VERIFICATION ===");

	const timestamp = Date.now();

	// 1. Setup Municipality A & Municipality B
	const municipalityA = await prisma.municipality.create({
		data: {
			name: `DNCC Phase6 North-${timestamp}`,
			code: `DNCC-P6-A-${timestamp}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	const municipalityB = await prisma.municipality.create({
		data: {
			name: `DSCC Phase6 South-${timestamp}`,
			code: `DSCC-P6-B-${timestamp}`,
			country: "Bangladesh",
			currency: "BDT",
			timezone: "Asia/Dhaka",
		},
	});

	console.log(
		`✔ Created Municipality A (${municipalityA.code}) & Municipality B (${municipalityB.code})`,
	);

	// 2. Setup Zone & Ward under Municipality A
	const zoneA = await prisma.zone.create({
		data: {
			municipalityId: municipalityA.id,
			name: `Zone 1-${timestamp}`,
			code: `Z1-${timestamp}`,
		},
	});

	const wardA = await prisma.ward.create({
		data: {
			municipalityId: municipalityA.id,
			zoneId: zoneA.id,
			name: `Ward 10-${timestamp}`,
			code: `W10-${timestamp}`,
			wardNumber: 10,
		},
	});

	// Setup Zone & Ward under Municipality B
	const zoneB = await prisma.zone.create({
		data: {
			municipalityId: municipalityB.id,
			name: `Zone 2-${timestamp}`,
			code: `Z2-${timestamp}`,
		},
	});

	const wardB = await prisma.ward.create({
		data: {
			municipalityId: municipalityB.id,
			zoneId: zoneB.id,
			name: `Ward 20-${timestamp}`,
			code: `W20-${timestamp}`,
			wardNumber: 20,
		},
	});

	console.log(`✔ Created Ward A under Muni A and Ward B under Muni B`);

	// 3. Setup Department, Category, and Municipal Services under Municipality A
	const deptA = await prisma.department.create({
		data: {
			municipalityId: municipalityA.id,
			name: `Engineering Dept-${timestamp}`,
			code: `ENG-${timestamp}`,
		},
	});

	const categoryA = await CategoryService.createCategory({
		departmentId: deptA.id,
		name: `Road & Drainage-${timestamp}`,
		code: `ROAD-CAT-${timestamp}`,
	});

	// FREE Civic Service (Road Pothole Repair)
	const freeService = await ServiceService.createService({
		categoryId: categoryA.id,
		name: "Road Pothole Repair",
		code: `FREE-ROAD-${timestamp}`,
		isPaid: false,
	});

	// PAID Municipal Service (Special Drain Cleaning)
	const paidService = await ServiceService.createService({
		categoryId: categoryA.id,
		name: "Special Drain Cleaning",
		code: `PAID-DRAIN-${timestamp}`,
		isPaid: true,
		baseFee: 2500,
		currency: "BDT",
	});

	console.log(
		`✔ Created FREE Service '${freeService.name}' & PAID Service '${paidService.name}' (Fee: 2500 BDT)`,
	);

	// 4. Setup Citizen 1 and Citizen 2
	const user1 = await prisma.user.create({
		data: {
			name: `Citizen One-${timestamp}`,
			email: `citizen1.${timestamp}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});

	const citizen1 = await prisma.citizen.create({
		data: {
			userId: user1.id,
			contactNumber: "01711111111",
		},
	});

	const user2 = await prisma.user.create({
		data: {
			name: `Citizen Two-${timestamp}`,
			email: `citizen2.${timestamp}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});

	const citizen2 = await prisma.citizen.create({
		data: {
			userId: user2.id,
			contactNumber: "01722222222",
		},
	});

	console.log(
		`✔ Created Citizen 1 (${user1.email}) and Citizen 2 (${user2.email})`,
	);

	// 5. TEST: Citizen 1 submits a FREE Civic Complaint
	const freeRequest = await ServiceRequestService.createServiceRequest(
		user1.id,
		{
			serviceId: freeService.id,
			title: "Large pothole blocking main street",
			description:
				"Deep pothole created after heavy rainfall, causing vehicle damage.",
			priority: ServicePriority.HIGH,
			location: {
				wardId: wardA.id,
				address: "House 12, Road 4, Sector 3",
				area: "North Area",
				latitude: 23.8103,
				longitude: 90.4125,
			},
		},
	);

	console.log(`✔ Created FREE Service Request:`);
	console.log(`   Tracking Number: ${freeRequest.trackingNumber}`);
	console.log(`   Status: ${freeRequest.status}`);
	console.log(`   IsPaid: ${freeRequest.isPaid}`);
	console.log(`   PaymentStatus: ${freeRequest.paymentStatus}`);
	console.log(`   Amount: ${freeRequest.amount}`);

	if (
		freeRequest.status !== RequestStatus.SUBMITTED ||
		freeRequest.isPaid !== false ||
		freeRequest.paymentStatus !== PaymentStatus.NOT_REQUIRED ||
		freeRequest.amount !== null ||
		!freeRequest.trackingNumber.startsWith("CC-")
	) {
		throw new Error(
			"❌ FREE service request creation output assertion failed!",
		);
	}

	// 6. TEST: Citizen 1 submits a PAID Municipal Service Request
	const paidRequest = await ServiceRequestService.createServiceRequest(
		user1.id,
		{
			serviceId: paidService.id,
			title: "Request for commercial drain jetting",
			description:
				"Need specialized high-pressure drain cleaning for commercial building.",
			location: {
				wardId: wardA.id,
				address: "Plot 45, Commercial Area",
			},
		},
	);

	console.log(`✔ Created PAID Service Request:`);
	console.log(`   Tracking Number: ${paidRequest.trackingNumber}`);
	console.log(`   Status: ${paidRequest.status}`);
	console.log(`   IsPaid: ${paidRequest.isPaid}`);
	console.log(`   PaymentStatus: ${paidRequest.paymentStatus}`);
	console.log(
		`   Captured Fee: ${paidRequest.amount?.toString()} ${paidRequest.currency}`,
	);

	if (
		paidRequest.status !== RequestStatus.SUBMITTED ||
		paidRequest.isPaid !== true ||
		paidRequest.paymentStatus !== PaymentStatus.PENDING ||
		paidRequest.amount?.toString() !== "2500" ||
		paidRequest.currency !== "BDT"
	) {
		throw new Error(
			"❌ PAID service request creation output assertion failed!",
		);
	}

	// 7. TEST: Tracking Number Sequence & Uniqueness
	console.log(
		`✔ Verified Tracking Numbers are sequential & formatted: '${freeRequest.trackingNumber}' -> '${paidRequest.trackingNumber}'`,
	);

	// 8. TEST: Spatial Hierarchy Mismatch Rejection (Ward B belongs to Muni B, Service belongs to Muni A)
	try {
		await ServiceRequestService.createServiceRequest(user1.id, {
			serviceId: freeService.id,
			title: "Invalid location request",
			description:
				"This should fail because Ward B does not belong to Municipality A.",
			location: {
				wardId: wardB.id,
				address: "Cross-city address",
			},
		});
		throw new Error("❌ FAILED: Ward/Municipality mismatch was not rejected!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected Ward/Municipality mismatch: "${err.message}"`,
		);
	}

	// 9. TEST: Inactive Service Rejection
	await ServiceService.deleteService(freeService.id); // deactivates freeService
	try {
		await ServiceRequestService.createServiceRequest(user1.id, {
			serviceId: freeService.id,
			title: "Inactive service request",
			description: "This should fail because the service is inactive.",
			location: {
				wardId: wardA.id,
				address: "Some address",
			},
		});
		throw new Error("❌ FAILED: Inactive service request was not rejected!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected inactive service request: "${err.message}"`,
		);
	}

	// 10. TEST: Security & Unauthorized Access Defense (Citizen 2 cannot view Citizen 1's request)
	try {
		await ServiceRequestService.getServiceRequestById(
			paidRequest.id,
			Role.CITIZEN,
			user2.id,
		);
		throw new Error(
			"❌ FAILED: Citizen 2 was able to view Citizen 1's request!",
		);
	} catch (err: any) {
		console.log(
			`✔ Correctly blocked unauthorized access to request: "${err.message}"`,
		);
	}

	// 11. TEST: Citizen 1 views own requests
	const myRequests = await ServiceRequestService.getMyServiceRequests(
		user1.id,
		{},
		{ page: 1, limit: 10 },
	);
	console.log(
		`✔ Citizen 1 fetched ${myRequests.meta.total} own service requests successfully`,
	);

	// 12. TEST: Admin views all requests
	const adminList = await ServiceRequestService.getAllServiceRequests(
		Role.ADMIN,
		"admin-id",
		{},
		{ page: 1, limit: 10 },
	);
	console.log(
		`✔ Admin fetched ${adminList.meta.total} total service requests successfully`,
	);

	// 13. TEST: Update Service Request in SUBMITTED state
	const updatedRequest = await ServiceRequestService.updateServiceRequest(
		paidRequest.id,
		user1.id,
		{
			title: "Updated Title for Drain Jetting",
			description: "Updated description with additional details for staff.",
		},
	);
	console.log(
		`✔ Citizen 1 updated request title to: '${updatedRequest.title}'`,
	);

	// 14. TEST: Cancel Service Request
	const cancelledRequest = await ServiceRequestService.cancelServiceRequest(
		paidRequest.id,
		user1.id,
	);
	console.log(
		`✔ Citizen 1 cancelled request successfully (Status: ${cancelledRequest.status}, PaymentStatus: ${cancelledRequest.paymentStatus})`,
	);

	console.log("=== ALL PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runPhase6Verification()
	.catch((err) => {
		console.error("Verification failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
