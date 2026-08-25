import { Router } from "express";
import {
  getSuppliers, getSupplierById, createSupplier,
  updateSupplier, deleteSupplier,
  addSupplierDebt, addSupplierPayment,
} from "../controllers/supplier.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SUPPLIERS_READ"), getSuppliers);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SUPPLIERS_READ"), getSupplierById);
router.post("/", protect, authorizeRoles("ADMIN"), requirePermission("SUPPLIERS_WRITE"), createSupplier);
router.put("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SUPPLIERS_WRITE"), updateSupplier);
router.delete("/:id", protect, authorizeRoles("ADMIN"), requirePermission("SUPPLIERS_WRITE"), deleteSupplier);
router.post("/:id/debts", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SUPPLIER_DEBTS_WRITE"), addSupplierDebt);
router.post("/:id/debts/:debtId/payments", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("SUPPLIER_DEBTS_WRITE"), addSupplierPayment);

export default router;