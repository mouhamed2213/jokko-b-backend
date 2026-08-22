import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { SaleReturnSchemas } from "./sale-return.schemas.js";
import { SaleReturnService } from "./sale-return.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const SaleReturnController = {
  getReturns: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleReturnSchemas.id(req.params.saleId);
      return res.status(200).json(await SaleReturnService.getReturns(user.shopId, saleId));
    } catch (error) {
      next(error);
    }
  },

  createReturn: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleReturnSchemas.id(req.params.saleId);
      const idempotencyKey = String(req.header("Idempotency-Key") || "").trim();
      const data = SaleReturnSchemas.create(req.body as Record<string, unknown>);
      const result = await SaleReturnService.createReturn(
        user.ownerId,
        user.shopId,
        user.userId,
        saleId,
        idempotencyKey,
        data,
      );

      return res.status(result.idempotent ? 200 : 201).json({
        message: result.idempotent ? "Retour déjà enregistré" : "Retour enregistré",
        return: result.saleReturn,
        sale: result.sale,
      });
    } catch (error) {
      next(error);
    }
  },
};
