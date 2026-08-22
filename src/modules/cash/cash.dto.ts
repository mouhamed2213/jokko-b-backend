export type CashPaymentMethod =
  | "CASH"
  | "WAVE"
  | "ORANGE_MONEY"
  | "FREE_MONEY"
  | "BANK"
  | "OTHER";

export type OpenCashDto = {
  openingAmount: number;
  note?: string;
};

export type CloseCashDto = {
  note?: string;
};

export type CashTransactionType = "IN" | "OUT";

export type CreateCashTransactionDto = {
  type: CashTransactionType;
  amount: number;
  label: string;
  reference?: string;
  paymentMethod: CashPaymentMethod;
};

export type CashHistoryQueryDto = {
  page: number;
  limit: number;
};

export type CashRecordInput = {
  shopId: number;
  amount: number;
  label: string;
  reference?: string | null;
  paymentMethod?: string;
};

export type CashRecordOptions = {
  required?: boolean;
};

export type CashReconciliationStatus = "BALANCED" | "SHORTAGE" | "SURPLUS";

export type ReconcileCashDto = {
  countedAmount: number;
  note?: string;
};
