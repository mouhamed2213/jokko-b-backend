import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { CategorySchemas } from "./category.schemas.js";
import { CategoryService } from "./category.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) {
    throw new UnauthorizedError("Token invalid ou à éxpiré");
  }
  return req.user;
};

export const CategoryController = {
  getCategories: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const categories = await CategoryService.getCategories(user.shopId);
      return res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  },

  createCategory: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const payload = CategorySchemas.create(
        req.body as Record<string, unknown>,
      );
      const category = await CategoryService.createCategory(
        user.shopId,
        payload,
      );
      return res.status(201).json({ message: "Catégorie créée", category });
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = CategorySchemas.id(req.params.id);
      await CategoryService.deleteCategory(user.shopId, id);
      return res.status(200).json({ message: "Catégorie supprimée" });
    } catch (error) {
      next(error);
    }
  },
};
