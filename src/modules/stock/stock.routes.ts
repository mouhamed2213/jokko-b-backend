import { Router } from "express";
import { StockController } from "./stock.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";

const router = Router();
const shopRoles = authorizeRoles("ADMIN", "EMPLOYEE");
const stockRead = requirePermission("STOCK_READ");
const stockWrite = requirePermission("STOCK_WRITE");

router.get("/movements", protect, shopRoles, stockRead, StockController.getStockMovements);
router.post("/entry", protect, shopRoles, stockWrite, idempotency, StockController.addStockEntry);
router.post("/out", protect, shopRoles, stockWrite, idempotency, StockController.addStockOut);

export default router;
