import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";
import type { AdvancedReport, AdvancedReportQueryDto } from "./advanced-report.dto.js";
import { AdvancedReportRepository } from "./advanced-report.repository.js";
import { AdvancedReportExporter } from "./advanced-report.exporter.js";

export const AdvancedReportService = {
  getReport: async (shopOwnerId: number, shopId: number, query: AdvancedReportQueryDto): Promise<AdvancedReport> => {
    const subscription = await PlanChecker.plan(shopId, shopOwnerId);
    if (subscription.plan.code === "FREE" || subscription.plan.code === "BASIC") {
      throw new ForbiddenError("Opération non autorisée");
    }
    const result = await AdvancedReportRepository.calculate(shopId, query);
    return {
      period: { from: query.from?.toISOString() ?? null, to: query.to?.toISOString() ?? null },
      granularity: query.granularity,
      ...result,
    };
  },

  exportReport: async (shopOwnerId: number, shopId: number, query: AdvancedReportQueryDto) => {
    const report = await AdvancedReportService.getReport(shopOwnerId, shopId, query);
    return AdvancedReportExporter.toCsv(report);
  },
};
