import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { ProductSchemas } from "./product.schemas.js";
import {
  computePrice,
  mapProductToDto,
  ProductService,
} from "./product.service.js";

export { computePrice, mapProductToDto };

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) {
    throw new UnauthorizedError("Token invalid ou à éxpiré");
  }
  return req.user;
};

export const ProductController = {
  getProducts: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = ProductSchemas.listQuery(
        req.query as Record<string, unknown>,
      );
      const result = await ProductService.getProducts(user.shopId, query);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getProductById: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ProductSchemas.id(req.params.id);
      const product = await ProductService.getProductById(user.shopId, id);
      return res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  },

    importCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      if (!req.file) return res.status(400).json({ message: "Fichier CSV requis" });
      const result = await ProductService.importCsv(user.ownerId, user.shopId, req.file);
      return res.status(201).json({ message: "Import produits terminé", ...result });
    } catch (error) {
      next(error);
    }
  },

  createProduct: async (

    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const payload = ProductSchemas.create(req.body as Record<string, unknown>);
      const product = await ProductService.createProduct(
        user.ownerId,
        user.shopId,
        payload,
        req.file,
      );

      return res.status(201).json({
        message: "Produit créé avec succès",
        product,
      });
    } catch (error) {
      next(error);
    }
  },

  updateProduct: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ProductSchemas.id(req.params.id);
      const payload = ProductSchemas.update(req.body as Record<string, unknown>);
      const product = await ProductService.updateProduct(
        user.shopId,
        id,
        payload,
        req.file,
      );

      return res.status(200).json({
        message: "Produit modifié avec succès",
        product,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteProduct: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ProductSchemas.id(req.params.id);
      await ProductService.deleteProduct(user.shopId, id);
      return res.status(200).json({ message: "Produit supprimé avec succès" });
    } catch (error) {
      next(error);
    }
  },

  getLowStockProducts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const products = await ProductService.getLowStockProducts(user.shopId);
      return res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },

  getOutOfStockProducts: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const products = await ProductService.getOutOfStockProducts(user.shopId);
      return res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },

  getSuggestedPrice: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = assertAuthenticated(req);
      const id = ProductSchemas.id(req.params.id);
      const quantity = ProductSchemas.quantity(req.query.quantity);
      const result = await ProductService.getSuggestedPrice(
        user.shopId,
        id,
        quantity,
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  uploadProductImage: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertAuthenticated(req);
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
      }

      return res.status(200).json({
        message: "Image uploadée avec succès",
        filename: req.file.filename,
      });
    } catch (error) {
      next(error);
    }
  },
};
