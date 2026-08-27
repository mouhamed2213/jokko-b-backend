// ============================================================
//  sale.routes.ts
// ============================================================
import { Router } from "express";
import {
    getSales, getSaleById, getDigitalReceipt, createSale, updateSale,

  addSalePayment, deleteSale,
} from "../controllers/sale.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { idempotency } from "../middlewares/idempotency.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SALES_READ"), getSales);
router.get("/:id/receipt", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SALES_READ"), getDigitalReceipt);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SALES_READ"), getSaleById);

router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SALES_WRITE"), idempotency, createSale);
router.put("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SALES_WRITE"), idempotency, updateSale);
router.patch("/:id/payment", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SALES_PAYMENTS"), idempotency, addSalePayment);
router.delete("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SALES_DELETE"), idempotency, deleteSale);
export default router;