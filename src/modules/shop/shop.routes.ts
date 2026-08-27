import { Router } from "express";
import { ShopController } from "./shop.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { upload } from "../../config/storage.config.js";

const router = Router();

router.post("/", ShopController.createShop);
router.post(
  "/create-second-shop",
  protect,
  authorizeRoles("ADMIN"),
  ShopController.createSecondShop,
);
router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  ShopController.getShops,
);
router.post(
  "/switch",
  protect,
  authorizeRoles("ADMIN"),
  ShopController.switchShop,
);
router.get(
  "/settings",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  ShopController.getShopSettings,
);
router.put(
  "/settings",
  protect,
  authorizeRoles("ADMIN"),
  ShopController.updateShopSettings,
);
router.post(
  "/logo",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("logo"),
  ShopController.uploadShopLogo,
);
router.delete(
  "/logo",
  protect,
  authorizeRoles("ADMIN"),
  ShopController.deleteShopLogo,
);

export default router;
