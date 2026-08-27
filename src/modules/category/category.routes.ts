import { Router } from "express";
import { CategoryController } from "./category.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  CategoryController.getCategories,
);
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  CategoryController.createCategory,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  CategoryController.deleteCategory,
);

export default router;
