import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/stats",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  DashboardController.getStats,
);

export default router;
