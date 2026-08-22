// ============================================================
//  sale.routes.ts
// ============================================================
import { Router } from "express";
import {
    getSales, getSaleById, getDigitalReceipt, createSale, updateSale,

  addSalePayment, deleteSale,
} from "../controllers/sale.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSales);
router.get("/:id/receipt", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getDigitalReceipt);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSaleById);

router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), createSale);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateSale);
router.patch("/:id/payment", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addSalePayment);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteSale);
export default router;