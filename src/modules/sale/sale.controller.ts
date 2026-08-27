import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { BadRequestError, UnauthorizedError } from "../../utils/errors.js";
import { SaleSchemas } from "./sale.schemas.js";
import { SaleService } from "./sale.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const SaleController = {
  getSales: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = SaleSchemas.list(req.query as Record<string, unknown>);
      return res.status(200).json(await SaleService.getSales(user.shopId, query));
    } catch (error) {
      next(error);
    }
  },

    getDigitalReceipt: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleSchemas.id(req.params.id);
      return res.status(200).json({
        receipt: await SaleService.getDigitalReceipt(user.shopId, saleId),
      });
    } catch (error) {
      next(error);
    }
  },

  getSaleById: async (req: AuthRequest, res: Response, next: NextFunction) => {

    try {
      const user = assertAuthenticated(req);
      const saleId = SaleSchemas.id(req.params.id);
      return res.status(200).json(await SaleService.getSaleById(user.shopId, saleId));
    } catch (error) {
      next(error);
    }
  },

  createSale: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const data = SaleSchemas.create(req.body as Record<string, unknown>);
      if (!data.clientId && !data.customerName) {
        throw new BadRequestError("Client ou nom du client requis");
      }
      const sale = await SaleService.createSale(user.ownerId, user.shopId, user.userId, data);
      return res.status(201).json({ message: "Vente enregistrée avec succès", sale });
    } catch (error) {
      next(error);
    }
  },

  updateSale: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleSchemas.id(req.params.id);
      const data = SaleSchemas.update(req.body as Record<string, unknown>);
      if (!data.clientId && !data.customerName) {
        throw new BadRequestError("Client ou nom du client requis");
      }
      const sale = await SaleService.updateSale(user.shopId, user.userId, saleId, data, req.header("If-Unmodified-Since") ?? undefined);
      return res.status(200).json({ message: "Facture modifiée avec succès", sale });
    } catch (error) {
      next(error);
    }
  },

  addSalePayment: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleSchemas.id(req.params.id);
      const data = SaleSchemas.payment(req.body as Record<string, unknown>);
      const sale = await SaleService.addPayment(user.shopId, saleId, data);
      return res.status(200).json({ message: "Paiement ajouté avec succès", sale });
    } catch (error) {
      next(error);
    }
  },

  deleteSale: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const saleId = SaleSchemas.id(req.params.id);
      await SaleService.deleteSale(user.shopId, user.userId, saleId);
      return res.status(200).json({ message: "Vente annulée et stock restauré" });
    } catch (error) {
      next(error);
    }
  },
};
