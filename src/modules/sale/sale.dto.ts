export type SaleItemDto = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type CreateSaleDto = {
  clientId?: number | null;
  customerName?: string;
  paidAmount?: number;
  paymentMethod: string;
  items: SaleItemDto[];
  note?: string;
};

export type UpdateSaleDto = {
  clientId?: number | null;
  customerName?: string;
  items: SaleItemDto[];
  note?: string;
};

export type SalePaymentDto = {
  amount: number;
  note?: string;
  paymentMethod: string;
};

export type SaleListQueryDto = {
  status?: string;
  clientId?: number;
  search?: string;
  page: number;
  limit: number;
};

export type InvoiceListQueryDto = {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
};
