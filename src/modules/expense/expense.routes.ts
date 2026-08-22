import { Router } from "express";
import { protect, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { ExpenseController } from "./expense.controller.js";

const router = Router();

router.use(protect, authorizeRoles("ADMIN", "EMPLOYEE"));
router.post("/", ExpenseController.create);
router.get("/summary", ExpenseController.summary);
router.get("/", ExpenseController.list);
router.get("/:id", ExpenseController.detail);

export default router;
