import { prisma } from "../../config/prisma.js";
import type { AdvancedReportQueryDto } from "./advanced-report.dto.js";

const round = (value: number) => Math.round(value * 100) / 100;
const dateFilter = (query: AdvancedReportQueryDto) => ({
  ...(query.from ? { gte: query.from } : {}),
  ...(query.to ? { lte: query.to } : {}),
});

const bucketOf = (value: Date, granularity: AdvancedReportQueryDto["granularity"]) => {
  const date = new Date(value);
  if (granularity === "month") return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  if (granularity === "week") {
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
  }
  return date.toISOString().slice(0, 10);
};

export const AdvancedReportRepository = {
  calculate: async (shopId: number, query: AdvancedReportQueryDto) => {
    const dateRange = dateFilter(query);
    const hasDateRange = Object.keys(dateRange).length > 0;
    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        ...(query.userId ? { userId: query.userId } : {}),
        ...(hasDateRange ? { createdAt: dateRange } : {}),
      },
      select: {
        createdAt: true,
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            totalAmount: true,
            unitCost: true,
            costTotal: true,
            product: { select: { categoryId: true, category: { select: { name: true } } } },
          },
        },
        returns: {
          ...(hasDateRange ? { where: { createdAt: dateRange } } : {}),
          select: {
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
    });
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true, ...(query.categoryId ? { categoryId: query.categoryId } : {}) },
      select: {
        id: true,
        name: true,
        quantity: true,
        purchasePrice: true,
        alertThreshold: true,
        categoryId: true,
        category: { select: { name: true } },
        stockMovements: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const expenses = await prisma.expense.findMany({
      where: { shopId, ...(hasDateRange ? { createdAt: dateRange } : {}) },
      select: { category: true, amount: true },
    });

    const productMap = new Map<number, {
      productId: number; productName: string; categoryName: string | null; unitsSold: number; unitsReturned: number;
      netRevenue: number; knownCost: number; knownMargin: number; stockQuantity: number; stockValue: number;
      lineCount: number; knownLineCount: number;
    }>();
    const trendMap = new Map<string, { bucket: string; revenue: number; refunds: number; netRevenue: number; knownCost: number; knownMargin: number; salesCount: number }>();
    const categoryMap = new Map<string, { categoryId: number | null; categoryName: string; netRevenue: number; knownCost: number; knownMargin: number; unitsSold: number }>();
    let grossRevenue = 0;
    let refunds = 0;
    let knownCost = 0;
    let unitsSold = 0;
    let unitsReturned = 0;
    let exactCostLines = 0;
    let unknownCostLines = 0;
    const soldProductIds = new Set<number>();

    const includeLine = (line: { productId: number | null; product?: { categoryId: number | null; category: { name: string } | null } | null }) =>
      line.productId !== null && (query.categoryId === undefined || line.product?.categoryId === query.categoryId);

    for (const sale of sales) {
      const bucket = bucketOf(sale.createdAt, query.granularity);
      const trend = trendMap.get(bucket) ?? { bucket, revenue: 0, refunds: 0, netRevenue: 0, knownCost: 0, knownMargin: 0, salesCount: 0 };
      trend.salesCount += 1;
      for (const line of sale.items) {
        if (!includeLine(line)) continue;
        const productId = line.productId!;
        soldProductIds.add(productId);
        const categoryName = line.product?.category?.name ?? "Sans catégorie";
        const row = productMap.get(productId) ?? { productId, productName: line.productName, categoryName: line.product?.category?.name ?? null, unitsSold: 0, unitsReturned: 0, netRevenue: 0, knownCost: 0, knownMargin: 0, stockQuantity: 0, stockValue: 0, lineCount: 0, knownLineCount: 0 };
        const category = categoryMap.get(String(line.product?.categoryId ?? "none")) ?? { categoryId: line.product?.categoryId ?? null, categoryName, netRevenue: 0, knownCost: 0, knownMargin: 0, unitsSold: 0 };
        row.unitsSold += line.quantity;
        row.netRevenue += line.totalAmount;
        row.lineCount += 1;
        category.unitsSold += line.quantity;
        category.netRevenue += line.totalAmount;
        grossRevenue += line.totalAmount;
        unitsSold += line.quantity;
        trend.revenue += line.totalAmount;
        if (line.unitCost !== null && line.costTotal !== null) {
          row.knownCost += line.costTotal;
          category.knownCost += line.costTotal;
          knownCost += line.costTotal;
          trend.knownCost += line.costTotal;
          row.knownLineCount += 1;
          exactCostLines += 1;
        } else unknownCostLines += 1;
        productMap.set(productId, row);
        categoryMap.set(String(line.product?.categoryId ?? "none"), category);
      }
      for (const saleReturn of sale.returns) {
        for (const line of saleReturn.items) {
          if (!includeLine(line)) continue;
          const row = productMap.get(line.productId!);
          if (!row) continue;
          row.unitsReturned += line.quantity;
          row.netRevenue -= line.totalAmount;
          refunds += line.totalAmount;
          unitsReturned += line.quantity;
          trend.refunds += line.totalAmount;
          const categoryId = products.find((product) => product.id === line.productId)?.categoryId ?? null;
          const category = categoryMap.get(String(categoryId)) ?? null;
          if (category) category.netRevenue -= line.totalAmount;
          if (line.costAmount !== null) {
            row.knownCost -= line.costAmount;
            knownCost -= line.costAmount;
            trend.knownCost -= line.costAmount;
          }
        }
      }
      trend.netRevenue = trend.revenue - trend.refunds;
      trend.knownMargin = trend.netRevenue - trend.knownCost;
      trendMap.set(bucket, trend);
    }

    const productRows = products.map((product) => {
      const row = productMap.get(product.id) ?? { productId: product.id, productName: product.name, categoryName: product.category?.name ?? null, unitsSold: 0, unitsReturned: 0, netRevenue: 0, knownCost: 0, knownMargin: 0, stockQuantity: product.quantity, stockValue: product.quantity * product.purchasePrice, lineCount: 0, knownLineCount: 0 };
      row.stockQuantity = product.quantity;
      row.stockValue = product.quantity * product.purchasePrice;
      row.knownMargin = row.netRevenue - row.knownCost;
      const costStatus: "EXACT" | "PARTIAL" | "UNAVAILABLE" = row.lineCount === 0 || row.knownLineCount === 0 ? "UNAVAILABLE" : row.lineCount === row.knownLineCount ? "EXACT" : "PARTIAL";
      return {
        productId: row.productId,
        productName: row.productName,
        categoryName: row.categoryName,
        unitsSold: row.unitsSold,
        unitsReturned: row.unitsReturned,
        netRevenue: row.netRevenue,
        knownCost: row.knownCost,
        knownMargin: row.knownMargin,
        stockQuantity: row.stockQuantity,
        stockValue: row.stockValue,
        turnover: row.unitsSold / Math.max(row.stockQuantity, 1),
        costStatus,
      };
    }).filter((row) => row.unitsSold > 0 || row.stockQuantity > 0).sort((a, b) => b.knownMargin - a.knownMargin);

    const categoryRows = [...categoryMap.values()].map((row) => ({ ...row, knownMargin: row.netRevenue - row.knownCost })).sort((a, b) => b.knownMargin - a.knownMargin);
    const expenseMap = new Map<string, number>();
    for (const expense of expenses) expenseMap.set(expense.category, (expenseMap.get(expense.category) ?? 0) + expense.amount);
    const stockUnits = products.reduce((sum, product) => sum + product.quantity, 0);
    const stockValue = products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0);
    const dormantProducts = products.filter((product) => !soldProductIds.has(product.id) && product.quantity > 0).map((product) => ({
      productId: product.id,
      productName: product.name,
      stockQuantity: product.quantity,
      stockValue: product.quantity * product.purchasePrice,
      lastMovementAt: product.stockMovements[0]?.createdAt.toISOString() ?? null,
    }));
    const operatingExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netRevenue = grossRevenue - refunds;
    return {
      kpis: {
        grossRevenue: round(grossRevenue), refunds: round(refunds), netRevenue: round(netRevenue), knownCost: round(knownCost),
        knownMargin: round(netRevenue - knownCost), knownMarginRate: netRevenue === 0 ? 0 : round(((netRevenue - knownCost) / netRevenue) * 100),
        operatingExpenses: round(operatingExpenses), knownNetResult: round(netRevenue - knownCost - operatingExpenses), salesCount: sales.length,
        averageBasket: sales.length === 0 ? 0 : round(netRevenue / sales.length), unitsSold, unitsReturned,
        costCoverageRate: exactCostLines + unknownCostLines === 0 ? 0 : round((exactCostLines / (exactCostLines + unknownCostLines)) * 100),
        stockUnits, stockValue: round(stockValue), lowStockCount: products.filter((product) => product.quantity > 0 && product.quantity <= product.alertThreshold).length,
        outOfStockCount: products.filter((product) => product.quantity <= 0).length, dormantProductsCount: dormantProducts.length,
        inventoryTurnover: stockUnits === 0 ? 0 : round(unitsSold / stockUnits),
      },
      trend: [...trendMap.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)).map((row) => ({ ...row, label: row.bucket })),
      products: productRows,
      categories: categoryRows,
      expenses: [...expenseMap.entries()].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount),
      dormantProducts,
    };
  },
};
