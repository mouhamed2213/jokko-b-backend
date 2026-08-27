import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { AuditLogController } from "./audit-log.controller.js";

const router = Router();
router.use(protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"));
router.get("/", AuditLogController.list);
router.get("/export", AuditLogController.csv);
export default router;
