import { Router } from "express";
import { NotificationController } from "../modules/notification/notification.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();
const shopRoles = authorizeRoles("ADMIN", "EMPLOYEE");
const adminRole = authorizeRoles("ADMIN");

router.get("/stream", protect, shopRoles, NotificationController.streamNotifications);
router.get("/stock-alerts", protect, shopRoles, NotificationController.getStockAlerts);
router.get("/", protect, shopRoles, NotificationController.getNotifications);
router.get("/preferences", protect, shopRoles, NotificationController.getPreferences);
router.put("/preferences", protect, adminRole, NotificationController.updatePreferences);
router.patch("/:id/read", protect, shopRoles, NotificationController.markRead);
router.post("/read-all", protect, shopRoles, NotificationController.markAllRead);

export default router;