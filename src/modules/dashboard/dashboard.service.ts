import { PlanChecker } from "../../services/plan-checker.service.js";
import type { DashboardStatsDto } from "./dashboard.dto.js";
import { DashboardRepository } from "./dashboard.repository.js";

export const DashboardService = {
  getStats: async (shopId: number, ownerId: number): Promise<DashboardStatsDto> => {
    const subscription = await PlanChecker.plan(shopId, ownerId);
    const hasAdvancedDashboard = subscription.plan.code !== "FREE";

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const recentStart = new Date(now);
    recentStart.setDate(recentStart.getDate() - 7);

    const [
      productSnapshot,
      totalProducts,
      totalClients,
      totalSuppliers,
      sales,
      totalSupplierDebt,
      cashRegister,
      topProducts,
    ] = await Promise.all([
      DashboardRepository.findProductSnapshot(shopId),
      DashboardRepository.countProducts(shopId),
      DashboardRepository.countClients(shopId),
      DashboardRepository.countSuppliers(shopId),
      DashboardRepository.findSalesSummary(shopId, monthStart, recentStart),
      hasAdvancedDashboard
        ? DashboardRepository.findSupplierDebtTotal(shopId)
        : Promise.resolve(0),
      DashboardRepository.findOpenCashRegister(shopId),
      hasAdvancedDashboard
        ? DashboardRepository.findTopProducts(shopId)
        : Promise.resolve([]),
    ]);

    const lowStockProducts = hasAdvancedDashboard
      ? productSnapshot.filter(
          (product) =>
            product.quantity > 0 && product.quantity <= product.alertThreshold,
        ).length
      : 0;
    const outOfStockProducts = hasAdvancedDashboard
      ? productSnapshot.filter((product) => product.quantity === 0).length
      : 0;
    const stockValue = hasAdvancedDashboard
      ? productSnapshot.reduce(
          (total, product) => total + product.quantity * product.purchasePrice,
          0,
        )
      : 0;

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      stockValue,
      totalSales: sales.totalSales,
      totalSalesAmount: sales.totalSalesAmount,
      totalPaidAmount: sales.totalPaidAmount,
      totalClientDebt: sales.totalClientDebt,
      recentSalesAmount: sales.recentSalesAmount,
      totalClients,
      totalSuppliers: hasAdvancedDashboard ? totalSuppliers : 0,
      totalSupplierDebt,
      cashOpen: cashRegister?.status === "OPEN",
      currentBalance: cashRegister
        ? cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut
        : null,
      currentMonthSalesAmount: sales.currentMonthSalesAmount,
      topProducts: hasAdvancedDashboard
        ? topProducts.map((product) => ({
            productId: product.productId,
            productName: product.productName,
            totalQuantity: product._sum.quantity,
            totalAmount: product._sum.totalAmount,
          }))
        : [],
    };
  },
};
