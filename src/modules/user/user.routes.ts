import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";

const router = Router();
const adminOnly = [protect, authorizeRoles("ADMIN")];

router.get("/", ...adminOnly, UserController.getUsers);
router.post("/", ...adminOnly, UserController.createUser);
router.put("/:id", ...adminOnly, UserController.updateUser);
router.delete("/:id", ...adminOnly, UserController.deleteUser);
router.get("/:id/permissions", ...adminOnly, UserController.getPermissions);
router.put("/:id/permissions", ...adminOnly, UserController.updatePermissions);

export default router;
