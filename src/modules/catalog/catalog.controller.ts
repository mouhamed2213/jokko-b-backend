import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { BadRequestError, UnauthorizedError } from "../../utils/errors.js";
import { CatalogService } from "./catalog.service.js";

const userOf = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalide ou expiré");
  return req.user;
};
const positive = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;

export const CatalogController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => { try { const user = userOf(req); return res.json(await CatalogService.list(user.ownerId, user.shopId)); } catch (error) { next(error); } },
  create: async (req: AuthRequest, res: Response, next: NextFunction) => { try { const user = userOf(req); const body = req.body as Record<string, unknown>; const item = await CatalogService.create(user.ownerId, user.shopId, { reference: String(body.reference || ""), name: String(body.name || ""), description: typeof body.description === "string" ? body.description : undefined, purchasePrice: Number(body.purchasePrice), baseSalePrice: Number(body.baseSalePrice) }); return res.status(201).json({ catalogProduct: item }); } catch (error) { next(error); } },
  setPrice: async (req: AuthRequest, res: Response, next: NextFunction) => { try { const user = userOf(req); const catalogProductId = Number(req.params.id); const targetShopId = Number((req.body as Record<string, unknown>).shopId); const salePrice = Number((req.body as Record<string, unknown>).salePrice); if (!positive(catalogProductId) || !positive(targetShopId) || !Number.isFinite(salePrice)) throw new BadRequestError("Paramètres de prix invalides"); return res.json({ priceRule: await CatalogService.setPrice(user.ownerId, user.shopId, catalogProductId, targetShopId, salePrice) }); } catch (error) { next(error); } },
};
