import { Router } from "express";
import {
    getClients, getClientById, getClientStatement, createClientReminder, createClient, updateClient, deleteClient,

} from "../controllers/client.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getClients);
router.get("/:id/statement", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getClientStatement);
router.post("/:id/reminders", protect, authorizeRoles("ADMIN", "EMPLOYEE"), createClientReminder);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getClientById);

router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), createClient);
router.put("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), updateClient);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteClient);
export default router;