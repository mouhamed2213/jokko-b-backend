import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { AuthService } from "./auth.service.js";

export const AuthController = {
  me: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accès non autorisé");
      }

      const me = await AuthService.getMe(req.user.userId, req.user.shopId);

      return res.status(200).json({ message: "ok", me });
    } catch (error) {
      next(error);
    }
  },
};
