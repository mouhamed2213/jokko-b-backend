import { Router } from "express";
import { ClientController } from "./client.controller.js";
import { authorizeRoles, protect } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { upload } from "../../config/storage.config.js";

const router = Router();

router.get(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_READ"),
  ClientController.getClients,
);
router.get(
  "/:id/statement",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_READ"),
  ClientController.getClientStatement,
);
router.post(
  "/:id/reminders",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_WRITE"),
  ClientController.createClientReminder,
);
router.get(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_READ"),
  ClientController.getClientById,
);
router.post(
  "/import",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("CLIENTS_WRITE"),
  upload.single("file"),
  ClientController.importCsv,
);
router.post(
  "/",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_WRITE"),
  ClientController.createClient,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  requirePermission("CLIENTS_WRITE"),
  ClientController.updateClient,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("ADMIN"),
  requirePermission("CLIENTS_WRITE"),
  ClientController.deleteClient,
);

export default router;
