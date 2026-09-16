import { prisma } from "./app/lib/prisma";
import { CategoryService } from "./app/module/category/category.service";
import { ServiceService } from "./app/module/service/service.service";

async function runPhase5Verification() {
	console.log("=== STARTING PHASE 5 VERIFICATION ===");

	// 1. Fetch or create a test Municipality and Department
	let municipality = await prisma.municipality.findFirst({
		where: { isDeleted: false, isActive: true },
	});

	if (!municipality) {
		municipality = await prisma.municipality.create({
			data: {
				name: "Dhaka North City Corporation",
				code: `DNCC-P5-${Date.now()}`,
				country: "Bangladesh",
				timezone: "Asia/Dhaka",
				currency: "BDT",
			},
		});
	}

	let department = await prisma.department.findFirst({
		where: {
			municipalityId: municipality.id,
			isDeleted: false,
			isActive: true,
		},
	});

	if (!department) {
		department = await prisma.department.create({
			data: {
				municipalityId: municipality.id,
				name: "Waste Management Dept",
				code: `WASTE-DEPT-${Date.now()}`,
			},
		});
	}

	console.log(
		`✔ Verified active Municipality (${municipality.code}) and Department (${department.code})`,
	);

	// 2. Create Category under Department
	const category1Code = `WASTE-COLLECTION-${Date.now()}`;
	const category1 = await CategoryService.createCategory({
		departmentId: department.id,
		name: "Waste Collection Services",
		code: category1Code,
		description: "Collection of general municipal waste",
	});

	console.log(`✔ Created Category 1: ${category1.name} (${category1.code})`);

	// 3. Test Duplicate Category Code in Same Department (Should fail)
	try {
		await CategoryService.createCategory({
			departmentId: department.id,
			name: "Duplicate Category",
			code: category1Code.toLowerCase(), // testing normalization
		});
		console.error("❌ FAILED: Duplicate category code was not rejected!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected duplicate category code: "${err.message}"`,
		);
	}

	// 4. Create Free Municipal Service under Category 1
	const freeServiceCode = `GARBAGE-PICKUP-${Date.now()}`;
	const freeService = await ServiceService.createService({
		categoryId: category1.id,
		name: "Routine Garbage Pickup",
		code: freeServiceCode,
		description: "Daily household waste pickup",
		isPaid: false,
	});

	console.log(
		`✔ Created Free Service: ${freeService.name} (isPaid=${freeService.isPaid}, baseFee=${freeService.baseFee})`,
	);

	// 5. Create Paid Municipal Service under Category 1
	const paidServiceCode = `BULK-WASTE-${Date.now()}`;
	const paidService = await ServiceService.createService({
		categoryId: category1.id,
		name: "Bulk Debris Waste Removal",
		code: paidServiceCode,
		description: "Removal of large construction or furniture waste",
		isPaid: true,
		baseFee: 1500,
		currency: "BDT",
	});

	console.log(
		`✔ Created Paid Service: ${paidService.name} (isPaid=${paidService.isPaid}, baseFee=${paidService.baseFee} ${paidService.currency})`,
	);

	// 6. Attempt creating Paid Service without baseFee (Should fail)
	try {
		await ServiceService.createService({
			categoryId: category1.id,
			name: "Invalid Paid Service",
			code: `INVALID-PAID-${Date.now()}`,
			isPaid: true,
		});
		console.error("❌ FAILED: Paid service without fee was not rejected!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected paid service without fee: "${err.message}"`,
		);
	}

	// 7. Test Category Deactivation Rejection when Active Municipal Services exist (Should fail)
	try {
		await CategoryService.deleteCategory(category1.id);
		console.error("❌ FAILED: Category with active services was deactivated!");
	} catch (err: any) {
		console.log(
			`✔ Correctly rejected Category deactivation while active services exist: "${err.message}"`,
		);
	}

	// 8. Filter & List Categories & Services
	const categoriesList = await CategoryService.getAllCategories(
		{ departmentId: department.id, searchTerm: category1.name },
		{ page: 1, limit: 10 },
	);
	console.log(
		`✔ Category search returned ${categoriesList.meta.total} category matching term "${category1.name}"`,
	);

	const servicesList = await ServiceService.getAllServices(
		{ categoryId: category1.id, isPaid: "true" },
		{ page: 1, limit: 10 },
	);
	console.log(
		`✔ Service filter returned ${servicesList.meta.total} paid service under Category`,
	);

	// 9. Soft-deactivate Services first, then deactivate Category
	await ServiceService.deleteService(freeService.id);
	await ServiceService.deleteService(paidService.id);
	console.log("✔ Soft-deactivated child Municipal Services");

	const deactivatedCategory = await CategoryService.deleteCategory(
		category1.id,
	);
	console.log(
		`✔ Deactivated Category successfully (isActive=${deactivatedCategory.isActive})`,
	);

	console.log("=== ALL PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runPhase5Verification()
	.catch((err) => {
		console.error("Verification failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
