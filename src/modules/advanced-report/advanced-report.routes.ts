import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { AdvancedReportController } from "./advanced-report.controller.js";

const router = Router();
router.get("/summary", protect, authorizeRoles("ADMIN", "EMPLOYEE"), AdvancedReportController.summary);
router.get("/export", protect, authorizeRoles("ADMIN", "EMPLOYEE"), AdvancedReportController.exportCsv);

export default router;
