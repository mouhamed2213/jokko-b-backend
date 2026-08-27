import { Router } from "express";
import { SupplierController } from "./supplier.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("SUPPLIERS_READ"),
  SupplierController.getSuppliers,
);
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("SUPPLIERS_READ"),
  SupplierController.getSupplierById,
);
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("SUPPLIERS_WRITE"),
  SupplierController.createSupplier,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("SUPPLIERS_WRITE"),
  SupplierController.updateSupplier,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("SUPPLIERS_WRITE"),
  SupplierController.deleteSupplier,
);
router.post(
  "/:id/debts",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("SUPPLIER_DEBTS_WRITE"),
  SupplierController.addSupplierDebt,
);
router.post(
  "/:id/debts/:debtId/payments",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("SUPPLIER_DEBTS_WRITE"),
  SupplierController.addSupplierPayment,
);

export default router;
