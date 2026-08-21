import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { DashboardSchemas } from "./dashboard.schemas.js";
import { DashboardService } from "./dashboard.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const DashboardController = {
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const context = DashboardSchemas.context(user.shopId, user.ownerId);
      const stats = await DashboardService.getStats(
        context.shopId,
        context.ownerId,
      );
      return res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  },
};
