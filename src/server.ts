import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { startNotificationWorker } from "./app/module/notification/notification.queue";
import { seedSuperAdmin, seedTesterAdmin } from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await redisClient.connect();
		console.log("Connected to the redis successfully.");

		// Start background notification queue worker
		startNotificationWorker();

		await transporter.verify();
		console.log("Connected to the smtp successfully.");

		// seed super admin
		await seedSuperAdmin();
		await seedTesterAdmin();

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
