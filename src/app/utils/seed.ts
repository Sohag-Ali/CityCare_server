import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
	try {
		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			console.log("Super Admin Name, Email, or Password Missing In Env File!");
			return;
		}

		const isSuperAdminExist = await prisma.user.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExist) {
			console.log("Super Admin Already Exists!");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.SUPER_ADMIN,
				emailVerified: true,
			},
		});

		console.log("Super Admin Created: ", superAdmin);
	} catch (error) {
		console.log("Error Seeding Super Admin: ", error);
	}
};

//create tester admin

export const seedTesterAdmin = async () => {
	try {
		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			console.log("Tester Admin Name, Email, or Password Missing In Env File!");
			return;
		}

		const isTesterAdminExist = await prisma.user.findUnique({
			where: {
				email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.ADMIN,
				emailVerified: true,
			},
		});

		console.log("Tester Admin Created: ", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin: ", error);
	}
};
