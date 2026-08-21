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
