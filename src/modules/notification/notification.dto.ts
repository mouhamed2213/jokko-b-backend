export type StockAlertProductDto = {
  id: number;
  name: string;
  quantity: number;
  alertThreshold: number;
  category?: { name: string } | null;
};

export type StockAlertsDto = {
  lowStock: StockAlertProductDto[];
  outOfStock: StockAlertProductDto[];
  total: number;
};

export type NotificationEventDto = {
  [key: string]: unknown;
};

export type NotificationType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "DORMANT_PRODUCT"
  | "CLIENT_DEBT"
  | "SUPPLIER_DEBT"
  | "SUBSCRIPTION_EXPIRY"
  | "LOW_MARGIN"
  | "CASH_DISCREPANCY";

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type NotificationDto = {
  id: number;
  shopId: number;
  type: NotificationType | string;
  severity: NotificationSeverity | string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  deduplicationKey: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferencesDto = {
  enabled: boolean;
  lowStockEnabled: boolean;
  outOfStockEnabled: boolean;
  dormantProductEnabled: boolean;
  clientDebtEnabled: boolean;
  supplierDebtEnabled: boolean;
  subscriptionExpiryEnabled: boolean;
  marginEnabled: boolean;
  cashDiscrepancyEnabled: boolean;
  dormantDays: number;
  subscriptionExpiryDays: number;
  clientDebtThreshold: number;
  supplierDebtThreshold: number;
  marginRateThreshold: number;
  marginPeriodDays: number;
};

export type UpdateNotificationPreferencesDto = Partial<NotificationPreferencesDto>;

export type NotificationListDto = {
  notifications: NotificationDto[];
  unreadCount: number;
};

export type NotificationEvaluationDto = {
  created: number;
  reactivated: number;
  resolved: number;
  unreadCount: number;
};
