import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { AuditLogService } from "./audit-log.service.js";

export const AuditLogController = {
  list: async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.user) throw new UnauthorizedError("Token invalide ou expiré"); return res.json(await AuditLogService.list(req.user.ownerId, req.user.shopId)); } catch (error) { next(error); } },
  csv: async (req: AuthRequest, res: Response, next: NextFunction) => { try { if (!req.user) throw new UnauthorizedError("Token invalide ou expiré"); const csv = await AuditLogService.csv(req.user.ownerId, req.user.shopId); res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename=\"jokko-audit-${new Date().toISOString().slice(0, 10)}.csv\"`); return res.send(csv); } catch (error) { next(error); } },
};
