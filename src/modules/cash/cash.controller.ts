import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { CashSchemas } from "./cash.schemas.js";
import { CashService } from "./cash.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const CashController = {
  openCash: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const data = CashSchemas.open(req.body as Record<string, unknown>);
      const cashRegister = await CashService.openCash(
        user.shopId,
        user.userId,
        data,
      );
      return res.status(201).json({ message: "Caisse ouverte avec succès", cashRegister });
    } catch (error) {
      next(error);
    }
  },

  closeCash: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const registerId = CashSchemas.id(req.params.id);
      const data = CashSchemas.close(req.body as Record<string, unknown>);
      const result = await CashService.closeCash(user.shopId, registerId, data);
      return res.status(200).json({
        message: "Caisse fermée avec succès",
        cashRegister: result.cashRegister,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  },

  getCurrentCash: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      return res.status(200).json(await CashService.getCurrentCash(user.shopId));
    } catch (error) {
      next(error);
    }
  },

  getCashHistory: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = CashSchemas.historyQuery(
        req.query as Record<string, unknown>,
      );
      return res.status(200).json(await CashService.getCashHistory(user.shopId, query));
    } catch (error) {
      next(error);
    }
  },

  getCashById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const registerId = CashSchemas.id(req.params.id);
      return res.status(200).json(
        await CashService.getCashById(user.shopId, registerId),
      );
    } catch (error) {
      next(error);
    }
  },

  addTransaction: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const data = CashSchemas.transaction(
        req.body as Record<string, unknown>,
      );
      const transaction = await CashService.addTransaction(user.shopId, data);
      return res.status(201).json({ message: "Transaction enregistrée", transaction });
    } catch (error) {
      next(error);
    }
  },
};
