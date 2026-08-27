import { Router } from "express";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { CatalogController } from "./catalog.controller.js";

const router = Router();
router.use(protect, authorizeRoles("ADMIN", "EMPLOYEE"));
router.get("/", requirePermission("PRODUCTS_READ"), CatalogController.list);
router.post("/", requirePermission("PRODUCTS_WRITE"), CatalogController.create);
router.put("/:id/prices", requirePermission("PRODUCTS_WRITE"), CatalogController.setPrice);
export default router;
