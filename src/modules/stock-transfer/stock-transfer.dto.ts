export type StockTransferStatus = "DRAFT" | "SHIPPED" | "RECEIVED" | "CANCELLED";

export type CreateStockTransferDto = {
  destinationShopId: number;
  items: Array<{ sourceProductId: number; destinationProductId?: number; quantity: number }>;
  note?: string;
};

export type StockTransferListQueryDto = {
  status?: StockTransferStatus;
  page: number;
  limit: number;
};
