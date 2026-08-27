import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";
import type { AdvancedReport, AdvancedReportQueryDto } from "./advanced-report.dto.js";
import { AdvancedReportRepository } from "./advanced-report.repository.js";
import { AdvancedReportExporter } from "./advanced-report.exporter.js";
import { ShopService } from "../shop/shop.service.js";

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

  getConsolidatedReport: async (shopOwnerId: number, shopId: number, query: AdvancedReportQueryDto): Promise<AdvancedReport> => {
    const subscription = await PlanChecker.plan(shopId, shopOwnerId);
    if (subscription.plan.code !== "PREMIUM") throw new ForbiddenError("La consolidation multi-boutiques nécessite un plan Premium");
    const shops = await ShopService.getShops(shopOwnerId);
    const reports = await Promise.all(shops.map((shop) => AdvancedReportRepository.calculate(shop.id, query)));
    const kpis = reports.reduce((acc: any, report: any) => {
      for (const key of ["grossRevenue", "refunds", "netRevenue", "knownCost", "knownMargin", "operatingExpenses", "knownNetResult", "salesCount", "unitsSold", "unitsReturned", "stockUnits", "stockValue", "lowStockCount", "outOfStockCount", "dormantProductsCount"]) acc[key] += report.kpis[key] || 0;
      return acc;
    }, { grossRevenue: 0, refunds: 0, netRevenue: 0, knownCost: 0, knownMargin: 0, operatingExpenses: 0, knownNetResult: 0, salesCount: 0, unitsSold: 0, unitsReturned: 0, stockUnits: 0, stockValue: 0, lowStockCount: 0, outOfStockCount: 0, dormantProductsCount: 0 });
    const merge = (key: string, identity: (row: any) => string) => [...new Map(reports.flatMap((report: any) => report[key]).map((row: any) => [identity(row), row])).values()];
    const trendMap = new Map<string, any>();
    for (const report of reports) for (const row of report.trend) { const current = trendMap.get(row.bucket) || { ...row, revenue: 0, refunds: 0, netRevenue: 0, knownCost: 0, knownMargin: 0, salesCount: 0 }; for (const key of ["revenue", "refunds", "netRevenue", "knownCost", "knownMargin", "salesCount"]) current[key] += row[key] || 0; trendMap.set(row.bucket, current); }
    kpis.knownMarginRate = kpis.netRevenue === 0 ? 0 : (kpis.knownMargin / kpis.netRevenue) * 100;
    kpis.averageBasket = kpis.salesCount === 0 ? 0 : kpis.netRevenue / kpis.salesCount;
    kpis.costCoverageRate = reports.reduce((sum: number, report: any) => sum + report.kpis.costCoverageRate, 0) / Math.max(reports.length, 1);
    kpis.inventoryTurnover = kpis.stockUnits === 0 ? 0 : kpis.unitsSold / kpis.stockUnits;
    return { period: { from: query.from?.toISOString() ?? null, to: query.to?.toISOString() ?? null }, granularity: query.granularity, kpis, trend: [...trendMap.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)), products: merge("products", (row) => row.productName), categories: merge("categories", (row) => row.categoryName), expenses: merge("expenses", (row) => row.category), dormantProducts: merge("dormantProducts", (row) => row.productName) } as AdvancedReport;
  },

  exportReport: async (shopOwnerId: number, shopId: number, query: AdvancedReportQueryDto) => {
    const report = await AdvancedReportService.getReport(shopOwnerId, shopId, query);
    return AdvancedReportExporter.toCsv(report);
  },
};
