import type { NextFunction, Request, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { AuthSchemas } from "./auth.schemas.js";
import { AuthService } from "./auth.service.js";

export const AuthController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials = AuthSchemas.login(req.body);
      const result = await AuthService.login(credentials);

      return res.status(200).json({
        message: "Connexion réussie",
        ...result,
      });
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError ||
        error instanceof ForbiddenError
      ) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      return res
        .status(500)
        .json({ message: "Erreur lors de la connexion", error });
    }
  },

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
