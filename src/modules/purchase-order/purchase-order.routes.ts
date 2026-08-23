import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { PurchaseOrderController } from "./purchase-order.controller.js";

const router = Router();
const operationalRoles = authorizeRoles("ADMIN", "EMPLOYEE");

router.get("/", protect, operationalRoles, requirePermission("PROCUREMENT_READ"), PurchaseOrderController.list);
router.post("/", protect, operationalRoles, requirePermission("PROCUREMENT_WRITE"), PurchaseOrderController.create);
router.get("/:id", protect, operationalRoles, requirePermission("PROCUREMENT_READ"), PurchaseOrderController.detail);
router.patch("/:id/order", protect, operationalRoles, requirePermission("PROCUREMENT_WRITE"), PurchaseOrderController.order);
router.post("/:id/receipts", protect, operationalRoles, requirePermission("PROCUREMENT_RECEIVE"), PurchaseOrderController.receive);
router.patch("/:id/cancel", protect, operationalRoles, requirePermission("PROCUREMENT_WRITE"), PurchaseOrderController.cancel);

export default router;
