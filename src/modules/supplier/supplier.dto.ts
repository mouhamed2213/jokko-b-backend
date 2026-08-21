export type SupplierDto = {
  id: number;
  shopId: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalDebt?: number;
  totalPaid?: number;
  totalPurchases?: number;
  deliveries?: number;
};

export type CreateSupplierDto = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type UpdateSupplierDto = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type CreateSupplierDebtDto = {
  totalAmount: number;
  paidAmount: number;
  note?: string;
  paymentMethod: string;
};

export type CreateSupplierPaymentDto = {
  amount: number;
  note?: string;
  paymentMethod: string;
};

export type SupplierDebtDto = {
  id: number;
  supplierId: number;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};
