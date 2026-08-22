export type RecordSupplierObligationDto = {
  shopId: number;
  supplierId: number;
  supplierName: string;
  productName?: string;
  quantity?: number;
  totalAmount: number;
  paidAmount: number;
  note?: string;
  paymentMethod: string;
  receiptId?: number;
};
