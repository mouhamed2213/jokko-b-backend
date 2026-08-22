import { Router } from "express";
import {
    getProducts, getProductById, createProduct, importProductsCsv,

  updateProduct, deleteProduct,
  getLowStockProducts, getOutOfStockProducts,
  getSuggestedPrice,
  uploadProductImage,
} from "../controllers/product.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../config/storage.config.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getProducts);
router.get("/low-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getLowStockProducts);
router.get("/out-of-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getOutOfStockProducts);
router.get("/:id/price", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSuggestedPrice);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getProductById);
router.post("/import", protect, authorizeRoles("ADMIN"), upload.single("file"), importProductsCsv);
router.post("/", protect, authorizeRoles("ADMIN"), upload.single("image"), createProduct);

router.put("/:id", protect, authorizeRoles("ADMIN"),upload.single("image"),  updateProduct);
router.delete("/:id", protect, authorizeRoles("ADMIN"),deleteProduct);


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