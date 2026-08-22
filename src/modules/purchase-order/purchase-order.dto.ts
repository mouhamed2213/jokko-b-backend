export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export type CreatePurchaseOrderDto = {
  supplierId: number;
  note?: string;
  items: Array<{
    productId: number;
    quantityOrdered: number;
    unitCost: number;
    productName?: string;
  }>;
};

export type ReceivePurchaseOrderDto = {
  items: Array<{
    orderItemId: number;
    quantity: number;
    unitCost?: number;
  }>;
  note?: string;
  paidAmount?: number;
  paymentMethod?: string;
};

export type PurchaseOrderListQueryDto = {
  status?: PurchaseOrderStatus;
  page: number;
  limit: number;
};
