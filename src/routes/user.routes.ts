import { Router } from "express";
import { createUser, deleteUser, getUsers, updateUser, getUserPermissions, updateUserPermissions } from "../controllers/user.controller.js";
import { authorizeRoles, protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN"), getUsers);
// router.get("/", protect, authorizeRoles("ADMIN"), catchAsync (getUsers));
router.post("/", protect, authorizeRoles("ADMIN"), createUser);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateUser);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteUser);
router.get("/:id/permissions", protect, authorizeRoles("ADMIN"), getUserPermissions);
router.put("/:id/permissions", protect, authorizeRoles("ADMIN"), updateUserPermissions);

export default router;

//