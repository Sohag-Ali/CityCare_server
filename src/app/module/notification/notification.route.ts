import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const router = Router();

// Get authenticated user's paginated notifications
router.get("/", auth(), NotificationController.getUserNotifications);

// Get unread notifications count
router.get("/unread-count", auth(), NotificationController.getUnreadCount);

// Mark all unread notifications as read
router.patch("/read-all", auth(), NotificationController.markAllAsRead);

// Mark single notification as read
router.patch("/:id/read", auth(), NotificationController.markAsRead);

export const NotificationRoutes = router;
