import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { MarginController } from "./margin.controller.js";

const router = Router();

router.get("/summary", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("REPORTS_READ"), MarginController.summary);

export default router;
