import { Router } from "express";
import { CashController } from "./cash.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";

const router = Router();
const shopRoles = authorizeRoles("ADMIN", "EMPLOYEE");
const cashRead = requirePermission("CASH_READ");
const cashWrite = requirePermission("CASH_WRITE");
const cashReconcile = requirePermission("CASH_RECONCILE");

router.get("/current", protect, shopRoles, cashRead, CashController.getCurrentCash);
router.get("/history", protect, shopRoles, cashRead, CashController.getCashHistory);
router.get("/:id", protect, shopRoles, cashRead, CashController.getCashById);
router.post("/open", protect, shopRoles, cashWrite, idempotency, CashController.openCash);
router.patch("/:id/close", protect, shopRoles, cashWrite, idempotency, CashController.closeCash);
router.get("/:id/reconciliation", protect, shopRoles, cashReconcile, CashController.getReconciliation);
router.post("/:id/reconciliation", protect, shopRoles, cashReconcile, idempotency, CashController.reconcileCash);
router.post("/transactions", protect, shopRoles, cashWrite, idempotency, CashController.addTransaction);

export default router;
