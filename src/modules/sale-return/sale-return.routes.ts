import { Router } from "express";
import { SaleReturnController } from "./sale-return.controller.js";
import { protect, authorizeRoles } from "../../middlewares/auth.middleware.js";

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
  SaleReturnController.createReturn,
);

export default router;
