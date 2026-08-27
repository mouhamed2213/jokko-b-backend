import { Router } from "express";
import { SaleController } from "./sale.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";

const router = Router();
const shopRoles = authorizeRoles("ADMIN", "EMPLOYEE");
const salesRead = requirePermission("SALES_READ");

router.get("/", protect, shopRoles, salesRead, SaleController.getSales);
router.get("/:id/receipt", protect, shopRoles, salesRead, SaleController.getDigitalReceipt);
router.get("/:id", protect, shopRoles, salesRead, SaleController.getSaleById);
router.post("/", protect, shopRoles, requirePermission("SALES_WRITE"), idempotency, SaleController.createSale);
router.put("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SALES_WRITE"), idempotency, SaleController.updateSale);
router.patch("/:id/payment", protect, shopRoles, requirePermission("SALES_PAYMENTS"), idempotency, SaleController.addSalePayment);
router.delete("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SALES_DELETE"), idempotency, SaleController.deleteSale);

export default router;
