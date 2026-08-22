export type AdvancedReportQueryDto = {
  from?: Date;
  to?: Date;
  granularity: "day" | "week" | "month";
  categoryId?: number;
  userId?: number;
};

export type AdvancedReport = {
  period: { from: string | null; to: string | null };
  granularity: AdvancedReportQueryDto["granularity"];
  kpis: {
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    knownCost: number;
    knownMargin: number;
    knownMarginRate: number;
    operatingExpenses: number;
    knownNetResult: number;
    salesCount: number;
    averageBasket: number;
    unitsSold: number;
    unitsReturned: number;
    costCoverageRate: number;
    stockUnits: number;
    stockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    dormantProductsCount: number;
    inventoryTurnover: number;
  };
  trend: Array<{ bucket: string; label: string; revenue: number; refunds: number; netRevenue: number; knownCost: number; knownMargin: number; salesCount: number }>;
  products: Array<{ productId: number; productName: string; categoryName: string | null; unitsSold: number; unitsReturned: number; netRevenue: number; knownCost: number; knownMargin: number; stockQuantity: number; stockValue: number; turnover: number; costStatus: "EXACT" | "PARTIAL" | "UNAVAILABLE" }>;
  categories: Array<{ categoryId: number | null; categoryName: string; netRevenue: number; knownCost: number; knownMargin: number; unitsSold: number }>;
  expenses: Array<{ category: string; amount: number }>;
  dormantProducts: Array<{ productId: number; productName: string; stockQuantity: number; stockValue: number; lastMovementAt: string | null }>;
};
