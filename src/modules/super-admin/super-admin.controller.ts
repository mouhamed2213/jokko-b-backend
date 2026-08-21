import type { NextFunction, Response } from "express";
import { getAuditActor } from "../../helpers/audit-logger.js";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { ForbiddenError, UnauthorizedError } from "../../utils/errors.js";
import { SuperAdminSchemas } from "./super-admin.schemas.js";
import { SuperAdminService } from "./super-admin.service.js";

const assertSuperAdmin = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  if (req.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Accès interdit");
  }
  return req.user;
};

export const SuperAdminController = {
  getStats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      return res.status(200).json(await SuperAdminService.getPlatformStats());
    } catch (error) {
      next(error);
    }
  },

  listShops: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      const query = SuperAdminSchemas.shopListQuery(req.query as Record<string, unknown>);
      return res.status(200).json(await SuperAdminService.listShops(query));
    } catch (error) {
      next(error);
    }
  },

  getShopDetail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      const shopId = SuperAdminSchemas.id(req.params.id, "Identifiant boutique");
      return res.status(200).json(await SuperAdminService.getShopDetail(shopId));
    } catch (error) {
      next(error);
    }
  },

  changePlan: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      const shopId = SuperAdminSchemas.id(req.body.shop_id, "Identifiant boutique");
      const planCode = String(req.body.planType ?? "").trim();
      if (!planCode) throw new ForbiddenError("Plan obligatoire");
      return res.status(200).json(
        await SuperAdminService.changePlan(shopId, planCode, getAuditActor(req)),
      );
    } catch (error) {
      next(error);
    }
  },

  updateSubscriptionStatus: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertSuperAdmin(req);
      const shopId = SuperAdminSchemas.id(req.params.shopId, "Identifiant boutique");
      const status = String(req.body.status ?? "").trim();
      return res.status(200).json(
        await SuperAdminService.updateSubscriptionStatus(
          shopId,
          status,
          getAuditActor(req),
        ),
      );
    } catch (error) {
      next(error);
    }
  },

  extendSubscription: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertSuperAdmin(req);
      const shopId = SuperAdminSchemas.id(req.params.shopId, "Identifiant boutique");
      const data = SuperAdminSchemas.extension(req.body as Record<string, unknown>);
      return res.status(200).json(
        await SuperAdminService.extendSubscription(shopId, data, getAuditActor(req)),
      );
    } catch (error) {
      next(error);
    }
  },

  updateShopStatus: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertSuperAdmin(req);
      const shopId = SuperAdminSchemas.id(req.params.shopId, "Identifiant boutique");
      const data = SuperAdminSchemas.shopStatus(req.body as Record<string, unknown>);
      return res.status(200).json(
        await SuperAdminService.updateShopStatus(shopId, data, getAuditActor(req)),
      );
    } catch (error) {
      next(error);
    }
  },

  listUsers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      const query = SuperAdminSchemas.userListQuery(req.query as Record<string, unknown>);
      return res.status(200).json(await SuperAdminService.listUsers(query));
    } catch (error) {
      next(error);
    }
  },

  getUserDetail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      assertSuperAdmin(req);
      const userId = SuperAdminSchemas.id(req.params.userId, "Identifiant utilisateur");
      return res.status(200).json(await SuperAdminService.getUserDetail(userId));
    } catch (error) {
      next(error);
    }
  },

  updateUserStatus: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      assertSuperAdmin(req);
      const userId = SuperAdminSchemas.id(req.params.userId, "Identifiant utilisateur");
      const data = SuperAdminSchemas.userStatus(req.body as Record<string, unknown>);
      return res.status(200).json(
        await SuperAdminService.updateUserStatus(userId, data, getAuditActor(req)),
      );
    } catch (error) {
      next(error);
    }
  },
};
