import { Router } from "express";
import { protectSuperAdmin } from "../../middlewares/auth.middleware.js";
import { SuperAdminController } from "./super-admin.controller.js";

const router = Router();

router.use(protectSuperAdmin);

router.get("/stats", SuperAdminController.getPlatformStats);
router.get("/plans", SuperAdminController.getPlans);
router.get("/audit", SuperAdminController.getGlobalAudit);
router.get("/shops", SuperAdminController.listShops);
router.get("/shops/:id", SuperAdminController.getShopDetail);
router.patch("/shops/:shopId/status", SuperAdminController.updateShopStatus);

router.post("/subscription", SuperAdminController.changePlan);
router.patch(
  "/shops/:shopId/subscription/status",
  SuperAdminController.updateSubscriptionStatus,
);
router.patch(
  "/shops/:shopId/subscription/extend",
  SuperAdminController.extendSubscription,
);

router.get("/users", SuperAdminController.listUsers);
router.get("/users/:userId", SuperAdminController.getUserDetail);
router.patch("/users/:userId/status", SuperAdminController.updateUserStatus);

export default router;
