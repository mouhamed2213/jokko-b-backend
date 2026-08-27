import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", AuthController.login);
router.post("/super-admin/login", AuthController.loginSuperAdmin);
router.post("/forgot-password", AuthController.forgotPassword);
router.get(
  "/me",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  AuthController.me,
);

export default router;
