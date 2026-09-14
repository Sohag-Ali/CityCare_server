import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	bak_url: process.env.APP_URL,
	frontend_url: process.env.FRONTEND_URL,
	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
	google_client_id: process.env.GOOGLE_CLIENT_ID!,

	super_admin_name: process.env.SUPER_ADMIN_NAME?.trim(),
	super_admin_email: process.env.SUPER_ADMIN_EMAIL?.trim(),
	super_admin_password: process.env.SUPER_ADMIN_PASSWORD?.trim(),

	tester_admin_name: (
		process.env.TESTER_ADMIN_NAME || process.env.ADMIN_NAME
	)?.trim(),
	tester_admin_email: (
		process.env.TESTER_ADMIN_EMAIL || process.env.ADMIN_EMAIL
	)?.trim(),
	tester_admin_password: (
		process.env.TESTER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
	)?.trim(),
};
