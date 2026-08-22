import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { MarginSchemas } from "./margin.schemas.js";
import { MarginService } from "./margin.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const MarginController = {
  summary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = MarginSchemas.query(req.query as Record<string, unknown>);
      return res.status(200).json(await MarginService.getSummary(user.ownerId, user.shopId, query));
    } catch (error) {
      next(error);
    }
  },
};
