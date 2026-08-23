import { Router } from "express";
import {
    getProducts, getProductById, createProduct, importProductsCsv,

  updateProduct, deleteProduct,
  getLowStockProducts, getOutOfStockProducts,
  getSuggestedPrice,
  uploadProductImage,
} from "../controllers/product.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { upload } from "../config/storage.config.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("PRODUCTS_READ"), getProducts);
router.get("/low-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("PRODUCTS_READ"), getLowStockProducts);
router.get("/out-of-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("PRODUCTS_READ"), getOutOfStockProducts);
router.get("/:id/price", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("PRODUCTS_READ"), getSuggestedPrice);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("PRODUCTS_READ"), getProductById);
router.post("/import", protect, authorizeRoles("ADMIN"), requirePermission("PRODUCTS_WRITE"), upload.single("file"), importProductsCsv);
router.post("/", protect, authorizeRoles("ADMIN"), requirePermission("PRODUCTS_WRITE"), upload.single("image"), createProduct);

router.put("/:id", protect, authorizeRoles("ADMIN"), requirePermission("PRODUCTS_WRITE"), upload.single("image"), updateProduct);
router.delete("/:id", protect, authorizeRoles("ADMIN"), requirePermission("PRODUCTS_WRITE"), deleteProduct);


// router.post(
//   "/upload/product-image",
//   protect,
//   authorizeRoles("ADMIN"),
//   upload.single("image"),
//   uploadProductImage
// );

// router.delete(
//   "/product-image/:filename",
//   protect,
//   authorizeRoles("ADMIN"),
//   deleteProductImage
// );

export default router;