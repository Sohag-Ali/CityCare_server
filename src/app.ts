import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	NextFunction,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { getBkashIdToken } from "./app/lib/bkash";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AdminRoutes } from "./app/module/admin/admin.route";
import { AssignmentRoutes } from "./app/module/assignment/assignment.route";
import { AuditLogRoutes } from "./app/module/auditLog/auditLog.route";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { CategoryRoutes } from "./app/module/category/category.route";
import { DepartmentRoutes } from "./app/module/department/department.route";
import { MunicipalityRoutes } from "./app/module/municipality/municipality.route";
import { NotificationRoutes } from "./app/module/notification/notification.route";
import { PaymentRoutes } from "./app/module/payment/payment.route";
import { ReportRoutes } from "./app/module/report/report.route";
import { ServiceRoutes } from "./app/module/service/service.route";
import { ServiceRequestRoutes } from "./app/module/serviceRequest/serviceRequest.route";
import { SlaRoutes } from "./app/module/sla/sla.route";
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
app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/municipalities", MunicipalityRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/wards", WardRoutes);
app.use("/api/v1/departments", DepartmentRoutes);
app.use("/api/v1/staff", StaffRoutes);
app.use("/api/v1/categories", CategoryRoutes);
app.use("/api/v1/services", ServiceRoutes);
app.use("/api/v1/service-requests", ServiceRequestRoutes);
app.use("/api/v1/assignments", AssignmentRoutes);
app.use("/api/v1/sla-policies", SlaRoutes);
app.use("/api/v1/payments", PaymentRoutes);
app.use("/api/v1/audit-logs", AuditLogRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/reports", ReportRoutes);

// app.get("/test", async (req: Request, res: Response, next : NextFunction) => {

// 	try {

// 		const grantIdTokenResult = await getBkashIdToken()

// 		console.log(grantIdTokenResult);

// 		res.status(httpStatus.OK).json({
// 			success: true,
// 			message: "Welcome to PH Healthcare System Backend",
// 			data : null
// 		});
// 	} catch (error) {
// 		console.log(error);
// 		next(error)
// 	}
// })

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
