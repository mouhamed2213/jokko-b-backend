import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { AdvancedReportController } from "./advanced-report.controller.js";

const router = Router();
router.get("/summary", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"), AdvancedReportController.summary);
router.get("/consolidated", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"), AdvancedReportController.consolidated);
router.get("/export", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"), AdvancedReportController.exportCsv);

export default router;
