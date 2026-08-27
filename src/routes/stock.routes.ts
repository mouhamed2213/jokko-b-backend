import { Router } from "express";
import { addStockEntry, addStockOut, getStockMovements } from "../controllers/stock.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { idempotency } from "../middlewares/idempotency.middleware.js";

const router = Router();

router.get("/movements", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_READ"), getStockMovements);
router.post("/entry", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), idempotency, addStockEntry);
router.post("/out", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), idempotency, addStockOut);

export default router;