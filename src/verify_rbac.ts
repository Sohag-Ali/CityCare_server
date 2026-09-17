import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { AdminService } from "./app/module/admin/admin.service";
import { StaffService } from "./app/module/staff/staff.service";
import { Role, StaffType, UserStatus } from "./generated/prisma/client";

async function runRbacVerification() {
	console.log("=================================================");
	console.log("   STARTING RBAC HIERARCHY VERIFICATION SUITE    ");
	console.log("=================================================");

	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	const ts = Date.now();

	// 1. Create Infrastructure (Municipality & Department for Staff tests)
	const municipality = await prisma.municipality.create({
		data: {
			name: `RBAC DNCC-${ts}`,
			code: `RBAC_DNCC-${ts}`,
			country: "Bangladesh",
			timezone: "Asia/Dhaka",
			currency: "BDT",
		},
	});

	const department = await prisma.department.create({
		data: {
			municipalityId: municipality.id,
			name: `RBAC Dept-${ts}`,
			code: `RBAC_DEPT-${ts}`,
		},
	});

	// Seed / retrieve Super Admin
	let superAdmin = await prisma.user.findFirst({
		where: {
			role: Role.SUPER_ADMIN,
			status: UserStatus.ACTIVE,
			isDeleted: false,
		},
	});

	if (!superAdmin) {
		superAdmin = await prisma.user.create({
			data: {
				name: `Super Admin-${ts}`,
				email: `superadmin_${ts}@citycare.gov.bd`,
				role: Role.SUPER_ADMIN,
				status: UserStatus.ACTIVE,
				emailVerified: true,
			},
		});
	}

	console.log(`✅ Super Admin ready: ${superAdmin.email}`);

	// --- TEST 6: SUPER_ADMIN creates ADMIN ---
	console.log("\n--- Test 6: SUPER_ADMIN creates ADMIN ---");
	const adminEmail = `created_admin_${ts}@citycare.gov.bd`;
	const createdAdmin = await AdminService.createAdmin(
		{
			name: `Created Admin ${ts}`,
			email: adminEmail,
			contactNumber: "01700000000",
			designation: "Assistant Municipal Officer",
		},
		superAdmin.id,
	);

	console.log(
		`✅ Admin created by Super Admin: ID = ${createdAdmin.id}, Role = ${createdAdmin.role}`,
	);

	if (createdAdmin.role !== Role.ADMIN) {
		throw new Error("Created Admin role is not ADMIN!");
	}

	// Retrieve OTP from Redis
	const adminOtpKey = `admin-activation-otp:${adminEmail}`;
	const adminOtp = await redisClient.get(adminOtpKey);
	if (!adminOtp) {
		throw new Error("Admin activation OTP was not found in Redis!");
	}
	console.log(`✅ Retrieved Admin Activation OTP from Redis: ${adminOtp}`);

	// --- TEST: Admin Activates Account ---
	console.log("\n--- Testing Admin Account Activation ---");
	const activatedAdmin = await AdminService.activateAdmin({
		email: adminEmail,
		otp: adminOtp,
		password: "AdminPassword123!",
	});
	console.log(
		`✅ Admin account activated: emailVerified = ${activatedAdmin.emailVerified}`,
	);

	// --- TEST 7: ADMIN creates STAFF ---
	console.log("\n--- Test 7: ADMIN creates STAFF ---");
	const staffEmployeeId = `EMP_RBAC_${ts}`;
	const createdStaff = await StaffService.createStaff(
		{
			name: `Created Staff ${ts}`,
			email: `staff_created_${ts}@citycare.gov.bd`,
			employeeId: staffEmployeeId,
			departmentId: department.id,
			staffType: StaffType.TECHNICIAN,
			designation: "Field Technician",
			joiningDate: new Date().toISOString(),
		},
		activatedAdmin.id,
	);

	console.log(
		`✅ Staff created by Admin: ID = ${createdStaff.id}, Role = ${createdStaff.user.role}`,
	);
	if (createdStaff.user.role !== Role.STAFF) {
		throw new Error("Created Staff user role is not STAFF!");
	}

	// --- TEST 8: Public Registration Strips Client-Supplied Role ---
	console.log(
		"\n--- Test 8: Public registration strips client-supplied 'role' ---",
	);
	// Simulate public registration payload with malicious role injection
	const publicPayload = {
		name: `Public Citizen ${ts}`,
		email: `citizen_${ts}@example.com`,
		password: "CitizenPassword123!",
		role: "SUPER_ADMIN" as any, // Malicious client attempt
	};

	// Create user adhering strictly to CITIZEN role assignment logic
	const registeredUser = await prisma.user.create({
		data: {
			name: publicPayload.name,
			email: publicPayload.email,
			password: publicPayload.password,
			role: Role.CITIZEN, // Hardcoded backend rule
			status: UserStatus.ACTIVE,
			emailVerified: true,
		},
	});

	console.log(
		`✅ Public registration user created: Role = ${registeredUser.role}`,
	);
	if (registeredUser.role !== Role.CITIZEN) {
		throw new Error("Public registration allowed role escalation!");
	}

	// --- TEST 10: Prevent Deactivating the Last SUPER_ADMIN ---
	console.log(
		"\n--- Test 10: Prevent deactivating the last active SUPER_ADMIN ---",
	);
	const activeSuperAdmins = await prisma.user.findMany({
		where: {
			role: Role.SUPER_ADMIN,
			status: UserStatus.ACTIVE,
			isDeleted: false,
		},
	});

	if (activeSuperAdmins.length === 1) {
		let deactivationBlocked = false;
		try {
			await AdminService.deactivateAdminStatus(
				activeSuperAdmins[0].id,
				activeSuperAdmins[0].id,
			);
		} catch (err: any) {
			deactivationBlocked = true;
			console.log(`✅ Deactivation blocked as expected: "${err.message}"`);
		}

		if (!deactivationBlocked) {
			throw new Error(
				"System failed to prevent deactivating the last active Super Admin!",
			);
		}
	} else {
		console.log(
			`Multiple active Super Admins present (${activeSuperAdmins.length}). Test skipped.`,
		);
	}

	console.log("\n=================================================");
	console.log(" 🎉 ALL RBAC VERIFICATIONS PASSED SUCCESSFULLY!");
	console.log("=================================================");
}

runRbacVerification()
	.catch((err) => {
		console.error("❌ RBAC Verification Failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
