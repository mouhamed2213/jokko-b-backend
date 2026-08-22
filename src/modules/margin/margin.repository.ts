import { prisma } from "../../config/prisma.js";
import type { MarginQueryDto, MarginProductRow } from "./margin.dto.js";

type SaleLine = {
  productId: number | null;
  productName: string;
  quantity: number;
  totalAmount: number;
  unitCost: number | null;
  costTotal: number | null;
};

type ReturnLine = {
  productId: number | null;
  productName: string;
  quantity: number;
  totalAmount: number;
  costAmount: number | null;
};

export const MarginRepository = {
  calculate: async (shopId: number, query: MarginQueryDto) => {
    const createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
    const saleWhere = { shopId, ...(Object.keys(createdAt).length ? { createdAt } : {}) };
    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: saleWhere,
        select: {
          items: {
            select: {
              productId: true,
              productName: true,
              quantity: true,
              totalAmount: true,
              unitCost: true,
              costTotal: true,
            },
          },
          returns: {
            ...(Object.keys(createdAt).length ? { where: { createdAt } } : {}),
            select: {
              refundAmount: true,
              items: {
                select: {
                  productId: true,
                  productName: true,
                  quantity: true,
                  totalAmount: true,
                  costAmount: true,
                },
              },
            },
          },
        },
      }),
      prisma.expense.aggregate({
        where: { shopId, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
        _sum: { amount: true },
      }),
    ]);

    const rows = new Map<number, MarginProductRow>();
    let revenue = 0;
    let refunds = 0;
    let knownCostBeforeReturns = 0;
    let returnedCost = 0;
    let exactCostLines = 0;
    let unknownCostLines = 0;

    const ensureRow = (line: { productId: number | null; productName: string }) => {
      if (line.productId === null) return null;
      if (query.productId !== undefined && query.productId !== line.productId) return null;
      const existing = rows.get(line.productId);
      if (existing) return existing;
      const row: MarginProductRow = {
        productId: line.productId,
        productName: line.productName,
        quantitySold: 0,
        quantityReturned: 0,
        revenue: 0,
        refunds: 0,
        netRevenue: 0,
        knownCost: 0,
        returnedCost: 0,
        knownMargin: 0,
        costStatus: "UNAVAILABLE",
      };
      rows.set(line.productId, row);
      return row;
    };

    for (const sale of sales as Array<{ items: SaleLine[]; returns: Array<{ refundAmount: number; items: ReturnLine[] }> }>) {
      for (const line of sale.items) {
        const row = ensureRow(line);
        if (!row) continue;
        revenue += line.totalAmount;
        row.quantitySold += line.quantity;
        row.revenue += line.totalAmount;
        if (line.unitCost !== null && line.costTotal !== null) {
          knownCostBeforeReturns += line.costTotal;
          row.knownCost += line.costTotal;
          exactCostLines += 1;
        } else {
          unknownCostLines += 1;
        }
      }
      for (const saleReturn of sale.returns) {
        const relevantItems = saleReturn.items.filter((line) => ensureRow(line) !== null);
        if (query.productId === undefined) refunds += saleReturn.refundAmount;
        else refunds += relevantItems.reduce((sum, line) => sum + line.totalAmount, 0);
        for (const line of relevantItems) {
          const row = ensureRow(line)!;
          row.quantityReturned += line.quantity;
          row.refunds += line.totalAmount;
          if (line.costAmount !== null) {
            returnedCost += line.costAmount;
            row.returnedCost += line.costAmount;
          }
        }
      }
    }

    const products = [...rows.values()].map((row) => {
      row.netRevenue = row.revenue - row.refunds;
      row.knownCost = row.knownCost - row.returnedCost;
      row.knownMargin = row.netRevenue - row.knownCost;
      const lineCount = sales.reduce((count, sale) => count + sale.items.filter((line) => line.productId === row.productId).length, 0);
      const knownLineCount = sales.reduce((count, sale) => count + sale.items.filter((line) => line.productId === row.productId && line.unitCost !== null && line.costTotal !== null).length, 0);
      row.costStatus = knownLineCount === 0 ? "UNAVAILABLE" : knownLineCount === lineCount ? "EXACT" : "PARTIAL";
      return row;
    }).sort((a, b) => b.knownMargin - a.knownMargin);

    const operatingExpenses = expenses._sum.amount ?? 0;
    const netRevenue = revenue - refunds;
    const knownCost = knownCostBeforeReturns - returnedCost;
    const knownMargin = netRevenue - knownCost;
    const totalLines = exactCostLines + unknownCostLines;
    return {
      revenue,
      refunds,
      netRevenue,
      knownCost,
      returnedCost,
      knownMargin,
      operatingExpenses,
      knownNetResult: knownMargin - operatingExpenses,
      exactCostLines,
      unknownCostLines,
      costCoverageRate: totalLines === 0 ? 0 : (exactCostLines / totalLines) * 100,
      products,
    };
  },
};
