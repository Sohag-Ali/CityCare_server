import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { DepartmentRoutes } from "./app/module/department/department.route";
import { MunicipalityRoutes } from "./app/module/municipality/municipality.route";
import { StaffRoutes } from "./app/module/staff/staff.route";
import { UserRoutes } from "./app/module/user/user.route";
import { WardRoutes } from "./app/module/ward/ward.route";
import { ZoneRoutes } from "./app/module/zone/zone.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/municipalities", MunicipalityRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/wards", WardRoutes);
app.use("/api/v1/departments", DepartmentRoutes);
app.use("/api/v1/staff", StaffRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to City Care Website",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
