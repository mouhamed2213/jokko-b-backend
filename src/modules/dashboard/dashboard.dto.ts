export type DashboardTopProductDto = {
  productId: number | null;
  productName: string;
  totalQuantity: number | null;
  totalAmount: number | null;
};

export type DashboardStatsDto = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockValue: number;
  totalSales: number;
  totalSalesAmount: number;
  totalPaidAmount: number;
  totalClientDebt: number;
  recentSalesAmount: number;
  totalClients: number;
  totalSuppliers: number;
  totalSupplierDebt: number;
  cashOpen: boolean;
  currentBalance: number | null;
  currentMonthSalesAmount: number;
  topProducts: DashboardTopProductDto[];
};

export type DashboardContextDto = {
  shopId: number;
  ownerId: number;
};
