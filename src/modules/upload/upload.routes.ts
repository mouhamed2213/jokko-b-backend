import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import {
  deleteProductImage,
  upload,
  uploadProductImage,
} from "./upload.controller.js";

const router = Router();

router.post(
  "/product-image",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("image"),
  uploadProductImage,
);
router.delete(
  "/product-image/:filename",
  protect,
  authorizeRoles("ADMIN"),
  deleteProductImage,
);

export default router;
