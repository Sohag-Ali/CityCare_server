import { Router } from "express";
import { Role } from "../../../generated/prisma/client";
import { auth } from "../../middleware/checkAuth";
import { AuditLogController } from "./auditLog.controller";

const router = Router();

// Global Audit Logs list (ADMIN & SUPER_ADMIN only)
router.get(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AuditLogController.getAllAuditLogs,
);

// Get Audit Log by ID (ADMIN & SUPER_ADMIN only)
router.get(
	"/:id",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AuditLogController.getAuditLogById,
);

export const AuditLogRoutes = router;
