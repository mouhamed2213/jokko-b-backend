import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { PurchaseOrderController } from "./purchase-order.controller.js";

const router = Router();
const operationalRoles = authorizeRoles("ADMIN", "EMPLOYEE");

router.get("/", protect, operationalRoles, PurchaseOrderController.list);
router.post("/", protect, operationalRoles, PurchaseOrderController.create);
router.get("/:id", protect, operationalRoles, PurchaseOrderController.detail);
router.patch("/:id/order", protect, operationalRoles, PurchaseOrderController.order);
router.post("/:id/receipts", protect, operationalRoles, PurchaseOrderController.receive);
router.patch("/:id/cancel", protect, operationalRoles, PurchaseOrderController.cancel);

export default router;
