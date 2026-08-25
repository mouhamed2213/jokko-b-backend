import { Router } from "express";
import {
  getClients, getClientById, getClientStatement, createClientReminder, importClientsCsv, createClient, updateClient, deleteClient,

} from "../controllers/client.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";
import { upload } from "../config/storage.config.js";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_READ"), getClients);
router.get("/:id/statement", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_READ"), getClientStatement);
router.post("/:id/reminders", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_WRITE"), createClientReminder);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_READ"), getClientById);

router.post("/import", protect, authorizeRoles("ADMIN"), requirePermission("CLIENTS_WRITE"), upload.single("file"), importClientsCsv);
router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_WRITE"), createClient);

router.put("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), requirePermission("CLIENTS_WRITE"), updateClient);
router.delete("/:id", protect, authorizeRoles("ADMIN"), requirePermission("CLIENTS_WRITE"), deleteClient);
export default router;