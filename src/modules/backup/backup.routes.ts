import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { BackupController } from "./backup.controller.js";

const router = Router();
router.use(protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"));
router.get("/export", BackupController.export);
router.post("/restore-preview", BackupController.validateRestore);
export default router;
