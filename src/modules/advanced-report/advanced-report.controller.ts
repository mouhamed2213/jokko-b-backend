import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { AdvancedReportSchemas } from "./advanced-report.schemas.js";
import { AdvancedReportService } from "./advanced-report.service.js";

export const AdvancedReportController = {
  summary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
      const query = AdvancedReportSchemas.query(req.query as Record<string, unknown>);
      return res.status(200).json(await AdvancedReportService.getReport(req.user.ownerId, req.user.shopId, query));
    } catch (error) {
      next(error);
    }
  },
};
