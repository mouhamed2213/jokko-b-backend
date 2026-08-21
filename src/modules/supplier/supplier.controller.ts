import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { SupplierSchemas } from "./supplier.schemas.js";
import { SupplierService } from "./supplier.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) {
    throw new UnauthorizedError("Token invalid ou expiré");
  }
  return req.user;
};

export const SupplierController = {
  getSuppliers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const suppliers = await SupplierService.getSuppliers(user.shopId);
      return res.status(200).json(suppliers);
    } catch (error) {
      next(error);
    }
  },

  getSupplierById: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const supplierId = SupplierSchemas.id(req.params.id);
      const supplier = await SupplierService.getSupplierById(
        user.shopId,
        supplierId,
      );
      return res.status(200).json(supplier);
    } catch (error) {
      next(error);
    }
  },

  createSupplier: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const data = SupplierSchemas.create(req.body as Record<string, unknown>);
      const supplier = await SupplierService.createSupplier(
        user.ownerId,
        user.shopId,
        data,
      );
      return res
        .status(201)
        .json({ message: "Fournisseur créé avec succès", supplier });
    } catch (error) {
      next(error);
    }
  },

  updateSupplier: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const supplierId = SupplierSchemas.id(req.params.id);
      const data = SupplierSchemas.update(
        req.body as Record<string, unknown>,
      );
      const supplier = await SupplierService.updateSupplier(
        user.shopId,
        supplierId,
        data,
      );
      return res.status(200).json({ message: "Fournisseur modifié", supplier });
    } catch (error) {
      next(error);
    }
  },

  deleteSupplier: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const supplierId = SupplierSchemas.id(req.params.id);
      await SupplierService.deleteSupplier(user.shopId, supplierId);
      return res.status(200).json({ message: "Fournisseur supprimé" });
    } catch (error) {
      next(error);
    }
  },

  addSupplierDebt: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const supplierId = SupplierSchemas.id(req.params.id);
      const data = SupplierSchemas.debt(req.body as Record<string, unknown>);
      const { debt } = await SupplierService.addSupplierDebt(
        user.shopId,
        supplierId,
        data,
      );
      return res.status(201).json({ message: "Dette enregistrée", debt });
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
      const supplierId = SupplierSchemas.id(req.params.id);
      const debtId = SupplierSchemas.id(req.params.debtId, "Identifiant dette");
      const data = SupplierSchemas.payment(
        req.body as Record<string, unknown>,
      );
      const result = await SupplierService.addSupplierPayment(
        user.shopId,
        supplierId,
        debtId,
        data,
      );
      return res.status(201).json({
        message: "Paiement enregistré",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
};
