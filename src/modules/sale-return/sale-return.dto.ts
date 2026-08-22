export type CreateSaleReturnItemDto = {
  saleItemId: number;
  quantity: number;
};

export type CreateSaleReturnDto = {
  items: CreateSaleReturnItemDto[];
  reason?: string;
};

export type SaleReturnListQueryDto = {
  saleId: number;
};
