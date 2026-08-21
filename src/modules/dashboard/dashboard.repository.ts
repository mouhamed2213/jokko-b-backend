import { prisma } from "../../config/prisma.js";

export const DashboardRepository = {
  findProductSnapshot: async (shopId: number) =>
    prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        quantity: true,
        alertThreshold: true,
        purchasePrice: true,
      },
    }),

  countProducts: async (shopId: number) =>
    prisma.product.count({ where: { shopId, isActive: true } }),

  countClients: async (shopId: number) =>
    prisma.client.count({ where: { shopId } }),

  countSuppliers: async (shopId: number) =>
    prisma.supplier.count({ where: { shopId } }),

  findSalesSummary: async (
    shopId: number,
    monthStart: Date,
    recentStart: Date,
  ) => {
    const [totalSales, totals, unpaid, currentMonth, recent] = await Promise.all([
      prisma.sale.count({ where: { shopId } }),
      prisma.sale.aggregate({
        where: { shopId },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.sale.aggregate({
        where: { shopId, status: { in: ["UNPAID", "PARTIAL"] } },
        _sum: { remaining: true },
      }),
      prisma.sale.aggregate({
        where: { shopId, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      prisma.sale.aggregate({
        where: { shopId, createdAt: { gte: recentStart } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalSales,
      totalSalesAmount: totals._sum.totalAmount ?? 0,
      totalPaidAmount: totals._sum.paidAmount ?? 0,
      totalClientDebt: unpaid._sum.remaining ?? 0,
      currentMonthSalesAmount: currentMonth._sum.totalAmount ?? 0,
      recentSalesAmount: recent._sum.totalAmount ?? 0,
    };
  },

  findSupplierDebtTotal: async (shopId: number) => {
    const result = await prisma.supplierDebt.aggregate({
      where: {
        supplier: { shopId },
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      _sum: { remaining: true },
    });
    return result._sum.remaining ?? 0;
  },

  findOpenCashRegister: async (shopId: number) =>
    prisma.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    }),

  findTopProducts: async (shopId: number) =>
    prisma.saleItem.groupBy({
      by: ["productId", "productName"],
      where: { sale: { shopId } },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
};
