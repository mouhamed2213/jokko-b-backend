import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { UserSchemas } from "./user.schemas.js";
import { UserService } from "./user.service.js";

export const UserController = {
  getUsers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const users = await UserService.getUsers(
        req.user.ownerId,
        req.user.shopId,
      );

      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  createUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const payload = UserSchemas.create(req.body);
      const user = await UserService.createUser(
        req.user.ownerId,
        req.user.shopId,
        payload,
      );

      return res.status(201).json({ message: "Utilisateur créé", user });
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const userId = UserSchemas.userId(req.params.id);
      const payload = UserSchemas.update(req.body);
      const user = await UserService.updateUser(
        req.user.ownerId,
        req.user.shopId,
        userId,
        payload,
      );

      return res.status(200).json({ message: "Utilisateur modifié", user });
    } catch (error) {
      next(error);
    }
  },

  deleteUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const userId = UserSchemas.userId(req.params.id);
      await UserService.deleteUser(
        req.user.ownerId,
        req.user.shopId,
        userId,
        req.user.userId,
      );

      return res.status(200).json({ message: "Utilisateur supprimé" });
    } catch (error) {
      next(error);
    }
  },
};
