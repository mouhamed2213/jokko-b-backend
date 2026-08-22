import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { ClientSchemas } from "./client.schemas.js";
import { ClientService } from "./client.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) {
    throw new UnauthorizedError("Token invalid ou à éxpiré");
  }
  return req.user;
};

export const ClientController = {
  getClients: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const clients = await ClientService.getClients(user.shopId);
      const customerCount = user.planType === "FREE" ? clients.length : null;

      return res.status(200).json({ data: clients, customerCount });
    } catch (error) {
      next(error);
    }
  },

    getClientStatement: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ClientSchemas.id(req.params.id);
      const query = ClientSchemas.statementQuery(req.query as Record<string, unknown>);
      return res.status(200).json(
        await ClientService.getClientStatement(user.ownerId, user.shopId, id, query),
      );
    } catch (error) {
      next(error);
    }
  },

  createClientReminder: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ClientSchemas.id(req.params.id);
      const payload = ClientSchemas.reminder(req.body as Record<string, unknown>);
      const reminder = await ClientService.createClientReminder(
        user.ownerId,
        user.shopId,
        user.userId,
        id,
        payload,
      );
      return res.status(201).json({ message: "Rappel enregistré", reminder });
    } catch (error) {
      next(error);
    }
  },

  getClientById: async (

    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ClientSchemas.id(req.params.id);
      const client = await ClientService.getClientById(user.shopId, id);
      return res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  },

    importCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      if (!req.file) return res.status(400).json({ message: "Fichier CSV requis" });
      const result = await ClientService.importCsv(user.ownerId, user.shopId, req.file);
      return res.status(201).json({ message: "Import clients terminé", ...result });
    } catch (error) {
      next(error);
    }
  },

  createClient: async (

    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const payload = ClientSchemas.create(req.body as Record<string, unknown>);
      const client = await ClientService.createClient(
        user.ownerId,
        user.shopId,
        payload,
      );

      return res.status(201).json({
        message: "Client créé avec succès",
        client,
      });
    } catch (error) {
      next(error);
    }
  },

  updateClient: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ClientSchemas.id(req.params.id);
      const payload = ClientSchemas.update(
        req.body as Record<string, unknown>,
      );
      const client = await ClientService.updateClient(user.shopId, id, payload);

      return res.status(200).json({ message: "Client modifié", client });
    } catch (error) {
      next(error);
    }
  },

  deleteClient: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ClientSchemas.id(req.params.id);
      await ClientService.deleteClient(user.shopId, id);
      return res.status(200).json({ message: "Client supprimé" });
    } catch (error) {
      next(error);
    }
  },
};
