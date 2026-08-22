import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { logger } from "../../config/logger.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { NotificationService } from "./notification.service.js";
import { NotificationSchemas } from "./notification.schemas.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalide ou expiré");
  return req.user;
};

const assertAdvancedAccess = async (req: AuthRequest) => {
  const user = assertAuthenticated(req);
  await NotificationService.assertAdvancedAccess(user.shopId, user.ownerId);
  return user;
};

export const NotificationController = {
  streamNotifications: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const { shopId, userId } = user;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      NotificationService.addClient(shopId, res);
      logger.info(`SSE connecté — Shop: ${shopId} — User: ${userId}`);

      NotificationService.writeToClient(res, "connected", {
        message: "Connexion établie",
        shopId,
      });

      try {
        const alerts = await NotificationService.getInitialStockAlerts(shopId);
        if (alerts.total > 0) {
          NotificationService.writeToClient(res, "stock_alert", {
            type: "initial",
            ...alerts,
          });
        }
        const subscription = await NotificationService.assertAdvancedAccess(shopId, user.ownerId);
        if (subscription) {
          const notifications = await NotificationService.getNotifications(shopId);
          NotificationService.writeToClient(res, "notification.initial", notifications);
        }
      } catch (error) {
        logger.error("Erreur envoi alertes initiales SSE", { error });
      }

      const heartbeat = setInterval(() => {
        try {
          res.write(": heartbeat\n\n");
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      req.on("close", () => {
        clearInterval(heartbeat);
        NotificationService.removeClient(shopId, res);
        logger.info(`SSE déconnecté — Shop: ${shopId} — User: ${userId}`);
      });
    } catch (error) {
      next(error);
    }
  },

  getStockAlerts: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const alerts = await NotificationService.getStockAlerts(user.shopId);
      return res.status(200).json(alerts);
    } catch (error) {
      next(error);
    }
  },

  getNotifications: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await assertAdvancedAccess(req);
      return res.status(200).json(await NotificationService.getNotifications(user.shopId));
    } catch (error) {
      next(error);
    }
  },

  getPreferences: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await assertAdvancedAccess(req);
      return res.status(200).json(await NotificationService.getPreferences(user.shopId));
    } catch (error) {
      next(error);
    }
  },

  updatePreferences: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await assertAdvancedAccess(req);
      const data = NotificationSchemas.updatePreferences(req.body);
      return res.status(200).json(
        await NotificationService.updatePreferences(user.shopId, data),
      );
    } catch (error) {
      next(error);
    }
  },

  markRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await assertAdvancedAccess(req);
      const notificationId = NotificationSchemas.notificationId(req.params.id);
      await NotificationService.markRead(user.shopId, notificationId);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  markAllRead: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await assertAdvancedAccess(req);
      return res.status(200).json(await NotificationService.markAllRead(user.shopId));
    } catch (error) {
      next(error);
    }
  },
};
