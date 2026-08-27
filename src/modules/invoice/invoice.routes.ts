import { Router } from "express";
import { InvoiceController } from "./invoice.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  InvoiceController.getInvoices,
);
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  InvoiceController.getInvoiceById,
);
router.patch(
  "/:id/payment",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  InvoiceController.addInvoicePayment,
);

export default router;
