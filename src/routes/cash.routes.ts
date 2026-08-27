import { Router } from "express";
import {
  openCash, closeCash, getCurrentCash,
    getCashHistory, getCashById, addTransaction,
  getReconciliation, reconcileCash,

} from "../controllers/cash.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { idempotency } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.get("/current", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_READ"), getCurrentCash);
router.get("/history", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_READ"), getCashHistory);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_READ"), getCashById);
router.post("/open", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_WRITE"), idempotency, openCash);
router.patch("/:id/close", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_WRITE"), idempotency, closeCash);
router.get("/:id/reconciliation", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_RECONCILE"), getReconciliation);
router.post("/:id/reconciliation", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_RECONCILE"), idempotency, reconcileCash);

router.post("/transactions", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CASH_WRITE"), idempotency, addTransaction);

export default router;