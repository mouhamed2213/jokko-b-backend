import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { PurchaseOrderSchemas } from "./purchase-order.schemas.js";
import { PurchaseOrderService } from "./purchase-order.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const PurchaseOrderController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = PurchaseOrderSchemas.list(req.query as Record<string, unknown>);
      return res.status(200).json(await PurchaseOrderService.getPurchaseOrders(user.ownerId, user.shopId, query));
    } catch (error) {
      next(error);
    }
  },

  detail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const id = PurchaseOrderSchemas.id(req.params.id);
      return res.status(200).json(await PurchaseOrderService.getPurchaseOrderById(user.ownerId, user.shopId, id));
    } catch (error) {
      next(error);
    }
  },

  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const data = PurchaseOrderSchemas.create(req.body as Record<string, unknown>);
      const order = await PurchaseOrderService.createPurchaseOrder(user.ownerId, user.shopId, user.userId, data);
      return res.status(201).json({ message: "Commande créée", purchaseOrder: order });
    } catch (error) {
      next(error);
    }
  },

  order: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const id = PurchaseOrderSchemas.id(req.params.id);
      const order = await PurchaseOrderService.markOrdered(user.ownerId, user.shopId, id);
      return res.status(200).json({ message: "Commande confirmée", purchaseOrder: order });
    } catch (error) {
      next(error);
    }
  },

  receive: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const id = PurchaseOrderSchemas.id(req.params.id);
      const data = PurchaseOrderSchemas.receive(req.body as Record<string, unknown>);
      const result = await PurchaseOrderService.receivePurchaseOrder(user.ownerId, user.shopId, user.userId, id, data);
      return res.status(201).json({ message: "Réception enregistrée", ...result });
    } catch (error) {
      next(error);
    }
  },

  cancel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const id = PurchaseOrderSchemas.id(req.params.id);
      const order = await PurchaseOrderService.cancel(user.ownerId, user.shopId, id);
      return res.status(200).json({ message: "Commande annulée", purchaseOrder: order });
    } catch (error) {
      next(error);
    }
  },
};
