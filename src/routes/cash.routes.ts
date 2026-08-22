import { Router } from "express";
import {
  openCash, closeCash, getCurrentCash,
    getCashHistory, getCashById, addTransaction,
  getReconciliation, reconcileCash,

} from "../controllers/cash.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/current", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCurrentCash);
router.get("/history", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCashHistory);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCashById);
router.post("/open", protect, authorizeRoles("ADMIN", "EMPLOYEE"), openCash);
router.patch("/:id/close", protect, authorizeRoles("ADMIN", "EMPLOYEE"), closeCash);
router.get("/:id/reconciliation", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getReconciliation);
router.post("/:id/reconciliation", protect, authorizeRoles("ADMIN", "EMPLOYEE"), reconcileCash);

router.post("/transactions", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addTransaction);

export default router;