import { Router } from "express";
import { NotificationController } from "../modules/notification/notification.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();
const shopRoles = authorizeRoles("ADMIN", "EMPLOYEE");
const adminRole = authorizeRoles("ADMIN");
const notificationsRead = requirePermission("NOTIFICATIONS_READ");

router.get("/stream", protect, shopRoles, notificationsRead, NotificationController.streamNotifications);
router.get("/stock-alerts", protect, shopRoles, notificationsRead, NotificationController.getStockAlerts);
router.get("/", protect, shopRoles, notificationsRead, NotificationController.getNotifications);
router.get("/preferences", protect, shopRoles, notificationsRead, NotificationController.getPreferences);
router.put("/preferences", protect, adminRole, notificationsRead, NotificationController.updatePreferences);
router.patch("/:id/read", protect, shopRoles, notificationsRead, NotificationController.markRead);
router.post("/read-all", protect, shopRoles, notificationsRead, NotificationController.markAllRead);

export default router;