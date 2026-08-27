import { Router } from "express";
import { SaleReturnController } from "./sale-return.controller.js";
import { protect, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";

const router = Router();

router.get(
  "/:saleId/returns",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  SaleReturnController.getReturns,
);
router.post(
  "/:saleId/returns",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  idempotency,
  SaleReturnController.createReturn,
);

export default router;
