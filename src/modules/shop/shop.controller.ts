import type { NextFunction, Request, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { ShopSchemas } from "./shop.schemas.js";
import { ShopService } from "./shop.service.js";
import type { SwitchShopDto } from "./shop.dto.js";

export const ShopController = {
  createSecondShop: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const payload = ShopSchemas.createSecondaryShop(req.body);
      const newShop = await ShopService.createSecondaryShop(
        req.user.ownerId,
        req.user.userId,
        payload,
      );

      return res.status(201).json({
        message: "Nouvelle boutique créee",
        newShop,
      });
    } catch (error) {
      next(error);
    }
  },

  getShops: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accée non autorisé");
      }

      const shops = await ShopService.getShops(req.user.ownerId);
      return res.status(200).json({ message: "Liste des boutiques", shops });
    } catch (error) {
      next(error);
    }
  },

  switchShop: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      const shopData = req.body as SwitchShopDto;
      const result = await ShopService.switchShop(req.user.ownerId, shopData);

      return res
        .status(200)
        .json({ message: "Liste des boutiques", ...result });
    } catch (error) {
      next(error);
    }
  },

  createShop: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = ShopSchemas.createShop(req.body);
      const existingShop = await ShopService.find(payload.email);

      if (existingShop && payload.currentShop === "PRIMARY") {
        return res
          .status(400)
          .json({ message: "Une boutique avec cet email existe déjà" });
      }

      const shop = await ShopService.createShop(payload);

      return res.status(201).json({
        success: true,
        message: "Boutique créée avec succès",
        shop,
      });
    } catch (error) {
      next(error);
    }
  },

  getShopSettings: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accès non autorisé");
      }

      const shop = await ShopService.getSettings(req.user.shopId);
      return res.status(200).json(shop);
    } catch (error) {
      next(error);
    }
  },

  updateShopSettings: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accès non autorisé");
      }

      const payload = ShopSchemas.updateSettings(req.body);
      const shop = await ShopService.updateSettings(
        req.user.shopId,
        req.user.ownerId,
        payload,
      );

      return res.status(200).json({ message: "Paramètres mis à jour", shop });
    } catch (error) {
      next(error);
    }
  },

  uploadShopLogo: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accès non autorisé");
      }

      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
      }

      const result = await ShopService.uploadLogo(req.user.shopId, req.file);

      return res.status(200).json({
        message: "Logo uploadé avec succès",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteShopLogo: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Accès non autorisé");
      }

      await ShopService.deleteLogo(req.user.shopId);
      return res.status(200).json({ message: "Logo supprimé" });
    } catch (error) {
      next(error);
    }
  },
};
