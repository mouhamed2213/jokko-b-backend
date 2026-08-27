import { Router } from "express";
import { ProductController } from "./product.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { upload } from "../../config/storage.config.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("PRODUCTS_READ"),
  ProductController.getProducts,
);
router.get(
  "/low-stock",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("PRODUCTS_READ"),
  ProductController.getLowStockProducts,
);
router.get(
  "/out-of-stock",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("PRODUCTS_READ"),
  ProductController.getOutOfStockProducts,
);
router.get(
  "/:id/price",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("PRODUCTS_READ"),
  ProductController.getSuggestedPrice,
);
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("PRODUCTS_READ"),
  ProductController.getProductById,
);
router.post(
  "/import",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("PRODUCTS_WRITE"),
  upload.single("file"),
  ProductController.importCsv,
);
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("PRODUCTS_WRITE"),
  upload.single("image"),
  ProductController.createProduct,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("PRODUCTS_WRITE"),
  upload.single("image"),
  ProductController.updateProduct,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("PRODUCTS_WRITE"),
  ProductController.deleteProduct,
);

export default router;
