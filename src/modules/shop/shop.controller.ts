import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import type { SwitchShopDto } from "./shop.dto.js";
import { ShopService } from "./shop.service.js";

export const ShopController = {
  switchShop: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Token invalid ou à éxpiré");
      }

      // Le DTO conserve le payload historique consommé par le frontend.
      const shopData = req.body as SwitchShopDto;
      const result = await ShopService.switchShop(req.user.ownerId, shopData);

      return res
        .status(200)
        .json({ message: "Liste des boutiques", ...result });
    } catch (error) {
      next(error);
    }
  },
};
