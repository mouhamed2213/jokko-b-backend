export const EXPENSE_CATEGORIES = [
  "PURCHASE",
  "TRANSPORT",
  "SALARY",
  "RENT",
  "UTILITIES",
  "TAX",
  "MAINTENANCE",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type CreateExpenseDto = {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  reference?: string;
  paymentMethod?: string;
};

export type ExpenseListQueryDto = {
  page: number;
  limit: number;
  category?: ExpenseCategory;
  from?: Date;
  to?: Date;
};

export type ExpenseSummary = {
  totalAmount: number;
  expenseCount: number;
  byCategory: Array<{
    category: ExpenseCategory;
    amount: number;
    count: number;
  }>;
};

export type ExpenseRecordInput = {
  shopId: number;
  userId: number;
  idempotencyKey: string;
  data: CreateExpenseDto;
};

export type DatabaseClient = any;

export type ExpenseResult = {
  expense: any;
  idempotent: boolean;
};
