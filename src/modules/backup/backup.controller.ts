import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { BackupService } from "./backup.service.js";

export const BackupController = {
  export: async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.user) throw new UnauthorizedError("Token invalide ou expiré"); const snapshot = await BackupService.snapshot(req.user.ownerId, req.user.shopId); res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename=\"jokko-backup-${new Date().toISOString().slice(0, 10)}.json\"`); return res.json(snapshot); } catch (error) { next(error); } },
};
