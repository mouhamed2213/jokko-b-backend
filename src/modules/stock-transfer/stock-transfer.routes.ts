import { Router } from "express";
import { protect, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { StockTransferController } from "./stock-transfer.controller.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_READ"), StockTransferController.list);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_READ"), StockTransferController.detail);
router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), StockTransferController.create);
router.post("/:id/ship", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), StockTransferController.ship);
router.post("/:id/receive", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), StockTransferController.receive);
router.post("/:id/cancel", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("STOCK_WRITE"), StockTransferController.cancel);

export default router;
