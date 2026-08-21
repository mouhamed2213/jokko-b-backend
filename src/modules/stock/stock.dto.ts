export type StockEntryDto = {
  productId: number;
  quantity: number;
  supplierId?: number;
  unitCost?: number;
  paidAmount: number;
  createDebt: boolean;
  note?: string;
};

export type StockOutDto = {
  productId: number;
  quantity: number;
  note?: string;
};

export type StockMovementQueryDto = {
  page: number;
  limit: number;
  productId?: number;
  type?: string;
};
