import type { NextFunction, Request, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { StockTransferSchemas } from "./stock-transfer.schemas.js";
import { StockTransferService } from "./stock-transfer.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const StockTransferController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = StockTransferSchemas.list(req.query as Record<string, unknown>);
      return res.status(200).json(await StockTransferService.list(user.ownerId, user.shopId, query));
    } catch (error) { next(error); }
  },
  detail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      return res.status(200).json(await StockTransferService.detail(user.ownerId, user.shopId, StockTransferSchemas.id(req.params.id)));
    } catch (error) { next(error); }
  },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const transfer = await StockTransferService.create(user.ownerId, user.shopId, user.userId, StockTransferSchemas.create(req.body as Record<string, unknown>));
      return res.status(201).json({ message: "Transfert créé", transfer });
    } catch (error) { next(error); }
  },
  ship: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const transfer = await StockTransferService.ship(user.ownerId, user.shopId, StockTransferSchemas.id(req.params.id));
      return res.status(200).json({ message: "Transfert expédié", transfer });
    } catch (error) { next(error); }
  },
  receive: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const transfer = await StockTransferService.receive(user.ownerId, user.shopId, StockTransferSchemas.id(req.params.id));
      return res.status(200).json({ message: "Transfert réceptionné", transfer });
    } catch (error) { next(error); }
  },
  cancel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const transfer = await StockTransferService.cancel(user.ownerId, user.shopId, StockTransferSchemas.id(req.params.id));
      return res.status(200).json({ message: "Transfert annulé", transfer });
    } catch (error) { next(error); }
  },
};
