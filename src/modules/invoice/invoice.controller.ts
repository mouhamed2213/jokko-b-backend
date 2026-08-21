import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { InvoiceSchemas } from "./invoice.schemas.js";
import { InvoiceService } from "./invoice.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const InvoiceController = {
  getInvoices: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = InvoiceSchemas.invoices(req.query as Record<string, unknown>);
      return res.status(200).json(await InvoiceService.getInvoices(user.shopId, query));
    } catch (error) {
      next(error);
    }
  },

  getInvoiceById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const invoiceId = InvoiceSchemas.id(req.params.id);
      return res.status(200).json(await InvoiceService.getInvoiceById(user.shopId, invoiceId));
    } catch (error) {
      next(error);
    }
  },

  addInvoicePayment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const invoiceId = InvoiceSchemas.id(req.params.id);
      const data = InvoiceSchemas.payment(req.body as Record<string, unknown>);
      const invoice = await InvoiceService.addPayment(user.shopId, invoiceId, data);
      return res.status(200).json({
        message: "Paiement enregistré sur la facture",
        invoice,
      });
    } catch (error) {
      next(error);
    }
  },
};
