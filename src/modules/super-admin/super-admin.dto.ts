export type ShopStatus = "ACTIVE" | "SUSPENDED";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type ShopListQueryDto = {
  page: number;
  limit: number;
  q?: string;
  status?: string;
  plan?: string;
};

export type SubscriptionExtensionDto = {
  endDate: Date;
  reason?: string;
};

export type UpdateShopStatusDto = {
  status: ShopStatus;
  reason?: string;
};

export type UpdateUserStatusDto = {
  isActive: boolean;
  reason?: string;
};

export type UserListQueryDto = {
  page: number;
  limit: number;
  q?: string;
  shopId?: number;
  role?: string;
  isActive?: boolean;
};

export type PlatformStatsDto = {
  totalShops: number;
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalClients: number;
  totalSales: number;
  totalRevenue: number;
  totalSubscriptionPayments: number;
  subscriptionPaymentAmount: number;
  pendingPayments: number;
  failedPayments: number;
  subscriptionsExpiringSoon: number;
  expiredSubscriptions: number;
  suspendedSubscriptions: number;
  shopsByStatus: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
  mrr: number;
  monthlyRecurringRevenue: number;
  recentShops: unknown[];
  recentSubscriptions: unknown[];
  recentPayments: unknown[];
  recentActivity: unknown[];
};
