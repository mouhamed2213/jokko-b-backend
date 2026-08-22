export type MarginQueryDto = {
  from?: Date;
  to?: Date;
  productId?: number;
};

export type MarginProductRow = {
  productId: number;
  productName: string;
  quantitySold: number;
  quantityReturned: number;
  revenue: number;
  refunds: number;
  netRevenue: number;
  knownCost: number;
  returnedCost: number;
  knownMargin: number;
  costStatus: "EXACT" | "PARTIAL" | "UNAVAILABLE";
};

export type MarginSummary = {
  period: { from: string | null; to: string | null };
  revenue: number;
  refunds: number;
  netRevenue: number;
  knownCost: number;
  returnedCost: number;
  knownMargin: number;
  operatingExpenses: number;
  knownNetResult: number;
  exactCostLines: number;
  unknownCostLines: number;
  costCoverageRate: number;
  products: MarginProductRow[];
};
