import { Router } from "express";
import { SubscriptionController } from "./subscription.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  SubscriptionController.getCurrentSubs,
);

export default router;
