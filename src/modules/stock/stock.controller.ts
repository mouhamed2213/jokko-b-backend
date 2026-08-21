import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { StockSchemas } from "./stock.schemas.js";
import { StockService } from "./stock.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const StockController = {
  addStockEntry: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const data = StockSchemas.entry(req.body as Record<string, unknown>);
      const result = await StockService.addStockEntry(
        user.shopId,
        user.userId,
        data,
      );
      return res.status(201).json({
        message: "Entrée de stock enregistrée",
        product: result.updatedProduct,
        movement: result.movement,
        debt: result.debt,
      });
    } catch (error) {
      next(error);
    }
  },

  addStockOut: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const data = StockSchemas.out(req.body as Record<string, unknown>);
      const result = await StockService.addStockOut(
        user.shopId,
        user.userId,
        data,
      );
      return res.status(201).json({
        message: "Sortie de stock enregistrée",
        product: result.updatedProduct,
        movement: result.movement,
      });
    } catch (error) {
      next(error);
    }
  },

  getStockMovements: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const query = StockSchemas.query(
        req.query as Record<string, unknown>,
      );
      const result = await StockService.getStockMovements(user.shopId, query);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
