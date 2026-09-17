import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { ReportController } from "./report.controller";

const router = Router();

// Overview Dashboard
router.get(
	"/overview",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getOverviewDashboard,
);

// Specific Request Analytics Sub-routes
router.get(
	"/requests/by-category",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getCategoryAnalytics,
);

router.get(
	"/requests/by-department",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getDepartmentAnalytics,
);

router.get(
	"/requests/by-ward",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getWardAnalytics,
);

router.get(
	"/requests/by-zone",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getZoneAnalytics,
);

router.get(
	"/requests/trends",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getRequestTrends,
);

// General Request Statistics
router.get(
	"/requests",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getRequestStatistics,
);

// Staff Workload Report
router.get(
	"/staff-workload",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getStaffWorkload,
);

// SLA Compliance Report
router.get(
	"/sla",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getSlaReport,
);

// Payment & Financial Report
router.get(
	"/payments",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	ReportController.getPaymentReport,
);

export const ReportRoutes = router;
