import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { logger } from "../../config/logger.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { NotificationService } from "./notification.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
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
      logger.info(
        `SSE connecté — Shop: ${shopId} — User: ${userId}`,
      );

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

  getStockAlerts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const alerts = await NotificationService.getStockAlerts(user.shopId);
      return res.status(200).json(alerts);
    } catch (error) {
      next(error);
    }
  },
};
