import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { AdvancedReportSchemas } from "./advanced-report.schemas.js";
import { AdvancedReportService } from "./advanced-report.service.js";

export const AdvancedReportController = {
  summary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError("Token invalide ou expiré");
      const query = AdvancedReportSchemas.query(req.query as Record<string, unknown>);
      return res.status(200).json(await AdvancedReportService.getReport(req.user.ownerId, req.user.shopId, query));
    } catch (error) {
      next(error);
    }
  },

  exportCsv: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError("Token invalide ou expiré");
      const { query } = AdvancedReportSchemas.exportQuery(req.query as Record<string, unknown>);
      const csv = await AdvancedReportService.exportReport(req.user.ownerId, req.user.shopId, query);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="jokko-rapport-${date}.csv"`);
      return res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },
};
