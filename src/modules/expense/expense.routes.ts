import { Router } from "express";
import { protect, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";
import { ExpenseController } from "./expense.controller.js";

const router = Router();

router.use(protect, authorizeRoles("ADMIN", "EMPLOYEE"));
router.post("/", requirePermission("EXPENSES_WRITE"), idempotency, ExpenseController.create);
router.get("/summary", requirePermission("EXPENSES_READ"), ExpenseController.summary);
router.get("/", requirePermission("EXPENSES_READ"), ExpenseController.list);
router.get("/:id", requirePermission("EXPENSES_READ"), ExpenseController.detail);

export default router;
