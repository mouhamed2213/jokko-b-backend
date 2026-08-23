import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { UserService } from "../modules/user/user.service.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import type { PermissionCode } from "../modules/user/permission.constants.js";

export const requirePermission = (code: PermissionCode) => async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new UnauthorizedError("Token invalide ou expiré");
    const allowed = await UserService.hasPermission(
      req.user.userId,
      req.user.shopId,
      req.user.role,
      code,
    );
    if (!allowed) throw new ForbiddenError("Opération non autorisée");
    next();
  } catch (error) {
    next(error);
  }
};
