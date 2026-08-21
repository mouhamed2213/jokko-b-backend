import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { PaymentSchemas } from "./payment.schemas.js";
import { PaymentService } from "./payment.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const PaymentController = {
  addSalePayment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = PaymentSchemas.id(req.params.id, "Identifiant vente");
      const data = PaymentSchemas.payment(req.body as Record<string, unknown>);
      const sale = await PaymentService.addSalePayment(user.shopId, saleId, data);
      return res.status(200).json({ message: "Paiement ajouté avec succès", sale });
    } catch (error) {
      next(error);
    }
  },

  addSupplierPayment: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const supplierId = PaymentSchemas.id(req.params.id, "Identifiant fournisseur");
      const debtId = PaymentSchemas.id(req.params.debtId, "Identifiant dette");
      const data = PaymentSchemas.payment(req.body as Record<string, unknown>);
      const result = await PaymentService.addSupplierPayment(
        user.shopId,
        supplierId,
        debtId,
        data,
      );
      return res.status(201).json({ message: "Paiement enregistré", ...result });
    } catch (error) {
      next(error);
    }
  },
};
