import { prisma } from "./app/lib/prisma";
import { ReportService } from "./app/module/report/report.service";
import { ReportValidation } from "./app/module/report/report.validation";
import {
	PaymentState,
	RequestStatus,
	Role,
	ServicePriority,
	SlaEventType,
	StaffType,
	UserStatus,
} from "./generated/prisma/client";

async function runPhase15Verification() {
	console.log("=================================================");
	console.log("   STARTING PHASE 15 VERIFICATION SUITE         ");
	console.log("=================================================");

	const ts = Date.now();

	// 1. Create test infrastructure data (Municipality, Zone, Ward, Department, Category, Service, Users, Requests, Payments, Assignments, SLA events)
	const municipality = await prisma.municipality.create({
		data: {
			name: `Phase15 DNCC-${ts}`,
			code: `DNCC15-${ts}`,
			country: "Bangladesh",
			timezone: "Asia/Dhaka",
			currency: "BDT",
		},
	});

	const zone = await prisma.zone.create({
		data: {
			municipalityId: municipality.id,
			name: `Phase15 Zone 1-${ts}`,
			code: `Z1-${ts}`,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			municipalityId: municipality.id,
			zoneId: zone.id,
			name: `Phase15 Ward 10-${ts}`,
			code: `W10-${ts}`,
			wardNumber: Math.floor(Math.random() * 90000) + 1000,
		},
	});

	const department = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `Phase15 Waste Management-${ts}`,
			code: `WM15-${ts}`,
		},
	});

	const category = await prisma.category.create({
		data: {
			departmentId: department.id,
			name: `Phase15 Garbage Overflow-${ts}`,
			code: `GO15-${ts}`,
		},
	});

	const paidService = await prisma.municipalService.create({
		data: {
			categoryId: category.id,
			name: `Phase15 Waste Disposal Special-${ts}`,
			code: `WDS15-${ts}`,
			isPaid: true,
			baseFee: 500.0,
			currency: "BDT",
		},
	});

	const citizenUser = await prisma.user.create({
		data: {
			name: `Phase15 Citizen-${ts}`,
			email: `citizen15_${ts}@example.com`,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
	});

	const citizen = await prisma.citizen.create({
		data: {
			userId: citizenUser.id,
			contactNumber: `01715${Math.floor(Math.random() * 1000000)}`,
			address: "Dhaka, Bangladesh",
		},
	});

	const staffUser = await prisma.user.create({
		data: {
			name: `Phase15 Staff-${ts}`,
			email: `staff15_${ts}@example.com`,
			role: Role.STAFF,
			status: UserStatus.ACTIVE,
		},
	});

	const staffProfile = await prisma.staffProfile.create({
		data: {
			userId: staffUser.id,
			employeeId: `EMP15_${ts}`,
			departmentId: department.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Senior Officer",
			joiningDate: new Date(),
		},
	});

	// Create test service request
	const request = await prisma.serviceRequest.create({
		data: {
			trackingNumber: `REQ15-${ts}`,
			citizenId: citizen.id,
			serviceId: paidService.id,
			title: `Phase 15 Test Waste Request-${ts}`,
			description: "Large volume garbage pile needing prompt collection.",
			priority: ServicePriority.HIGH,
			status: RequestStatus.IN_PROGRESS,
			isPaid: true,
			amount: 500.0,
			currency: "BDT",
			responseDueAt: new Date(Date.now() + 86400000),
			resolutionDueAt: new Date(Date.now() - 3600000), // SLA overdue
			location: {
				create: {
					wardId: ward.id,
					address: "Road 12, Block C",
				},
			},
			slaEvents: {
				create: [
					{
						type: SlaEventType.WARNING,
						metadata: "80% SLA time elapsed",
					},
					{
						type: SlaEventType.BREACH,
						metadata: "Resolution time exceeded",
					},
				],
			},
		},
	});

	// Create payment
	const payment = await prisma.payment.create({
		data: {
			serviceRequestId: request.id,
			citizenId: citizen.id,
			amount: 500.0,
			currency: "BDT",
			status: PaymentState.SUCCESS,
			paymentMethod: "BKASH",
			merchantInvoiceNumber: `INV15_${ts}`,
			bkashPaymentId: `PAY15_${ts}`,
			bkashTransactionId: `TRX15_${ts}`,
			completedAt: new Date(),
		},
	});

	// Create assignment
	await prisma.assignment.create({
		data: {
			serviceRequestId: request.id,
			technicianId: staffProfile.id,
			assignedById: staffUser.id,
			acceptedAt: new Date(),
		},
	});

	console.log("✅ Seeded test dataset successfully.");

	// 2. Test Overview Dashboard
	console.log("\n--- Testing 1. Overview Dashboard ---");
	const overview = await ReportService.getOverviewDashboard({});
	console.log("Overview Dashboard Result:", JSON.stringify(overview, null, 2));
	if (overview.totalRequests < 1 || overview.successfulPayments < 1) {
		throw new Error("Overview report calculation failed.");
	}

	// 3. Test Request Statistics
	console.log("\n--- Testing 2. Request Statistics ---");
	const requestStats = await ReportService.getRequestStatistics({});
	console.log("Request Stats Result:", JSON.stringify(requestStats, null, 2));
	if (requestStats.totalRequests < 1) {
		throw new Error("Request statistics calculation failed.");
	}

	// 4. Test Category Analytics
	console.log("\n--- Testing 3. Category Analytics ---");
	const categoryAnalytics = await ReportService.getCategoryAnalytics({
		departmentId: department.id,
	});
	console.log(
		"Category Analytics Result:",
		JSON.stringify(categoryAnalytics, null, 2),
	);
	if (categoryAnalytics.length === 0) {
		throw new Error("Category analytics calculation failed.");
	}

	// 5. Test Department Analytics
	console.log("\n--- Testing 4. Department Analytics ---");
	const departmentAnalytics = await ReportService.getDepartmentAnalytics({});
	console.log(
		"Department Analytics Result:",
		JSON.stringify(departmentAnalytics, null, 2),
	);
	const targetDept = departmentAnalytics.find(
		(d) => d.departmentId === department.id,
	);
	if (
		!targetDept ||
		targetDept.totalRequests < 1 ||
		targetDept.slaBreaches < 1
	) {
		throw new Error("Department analytics calculation failed.");
	}

	// 6. Test Ward Analytics
	console.log("\n--- Testing 5. Ward Analytics ---");
	const wardAnalytics = await ReportService.getWardAnalytics({
		zoneId: zone.id,
	});
	console.log("Ward Analytics Result:", JSON.stringify(wardAnalytics, null, 2));
	const targetWard = wardAnalytics.find((w) => w.wardId === ward.id);
	if (!targetWard || targetWard.totalRequests < 1) {
		throw new Error("Ward analytics calculation failed.");
	}

	// 7. Test Zone Analytics
	console.log("\n--- Testing 6. Zone Analytics ---");
	const zoneAnalytics = await ReportService.getZoneAnalytics({});
	console.log("Zone Analytics Result:", JSON.stringify(zoneAnalytics, null, 2));
	const targetZone = zoneAnalytics.find((z) => z.zoneId === zone.id);
	if (!targetZone || targetZone.totalRequests < 1) {
		throw new Error("Zone analytics calculation failed.");
	}

	// 8. Test Request Trends
	console.log("\n--- Testing 7. Request Trends ---");
	const trendsMonth = await ReportService.getRequestTrends({
		groupBy: "month",
	});
	console.log(
		"Request Trends Result (Month):",
		JSON.stringify(trendsMonth, null, 2),
	);
	if (trendsMonth.length === 0) {
		throw new Error("Request trends calculation failed.");
	}

	// 9. Test Staff Workload
	console.log("\n--- Testing 8. Staff Workload ---");
	const staffWorkload = await ReportService.getStaffWorkload(
		{ departmentId: department.id },
		{ page: 1, limit: 10 },
	);
	console.log("Staff Workload Result:", JSON.stringify(staffWorkload, null, 2));
	const targetStaff = staffWorkload.data.find(
		(s) => s.staffId === staffProfile.id,
	);
	if (!targetStaff || targetStaff.assignedRequests < 1) {
		throw new Error("Staff workload calculation failed.");
	}

	// 10. Test SLA Report
	console.log("\n--- Testing 9. SLA Report ---");
	const slaReport = await ReportService.getSlaReport({
		departmentId: department.id,
	});
	console.log("SLA Report Result:", JSON.stringify(slaReport, null, 2));
	if (slaReport.totalRequestsWithSla < 1 || slaReport.slaBreached < 1) {
		throw new Error("SLA report calculation failed.");
	}

	// 11. Test Payment Report
	console.log("\n--- Testing 10. Payment Report ---");
	const paymentReport = await ReportService.getPaymentReport({});
	console.log("Payment Report Result:", JSON.stringify(paymentReport, null, 2));
	if (
		paymentReport.successfulPayments < 1 ||
		paymentReport.totalRevenue < 500
	) {
		throw new Error("Payment report calculation failed.");
	}

	// 12. Test Date Range Validation
	console.log("\n--- Testing 11. Date Range Validation ---");
	const validRange = ReportValidation.parseReportDateRange(
		"2026-01-01",
		"2026-12-31",
	);
	console.log("Valid Date Range Parsed:", validRange);

	let invalidRangeThrown = false;
	try {
		ReportValidation.parseReportDateRange("2026-12-31", "2026-01-01");
	} catch (err: any) {
		invalidRangeThrown = true;
		console.log("Caught expected date range error:", err.message);
	}
	if (!invalidRangeThrown) {
		throw new Error("Date validation failed to reject invalid date range.");
	}

	console.log("\n=================================================");
	console.log(" 🎉 ALL PHASE 15 VERIFICATIONS PASSED SUCCESSFULLY!");
	console.log("=================================================");
}

runPhase15Verification()
	.catch((err) => {
		console.error("❌ Verification Failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
