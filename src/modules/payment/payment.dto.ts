import type { PaymentMethod, PaymentStatus } from "../../database/prisma/generated/prisma/enums.js";

export type PaymentInputDto = {
  amount: number;
  note?: string;
  paymentMethod: string;
};

export type SalePaymentDto = PaymentInputDto;
export type SupplierPaymentDto = PaymentInputDto;

export type CreateSubscriptionPaymentDto = {
  shopOwnerId: number;
  subscriptionId: number;
  planId: number;
  provider: PaymentMethod;
  amount: number;
  planCode?: string;
  planName?: string;
};

export type UpdateSubscriptionPaymentDto = {
  status: PaymentStatus;
  transactionReference?: string;
  providerReference?: string;
  paidAt?: Date;
};
