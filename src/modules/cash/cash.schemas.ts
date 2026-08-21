import { BadRequestError } from "../../utils/errors.js";
import type {
  CashHistoryQueryDto,
  CashPaymentMethod,
  CloseCashDto,
  CreateCashTransactionDto,
  OpenCashDto,
} from "./cash.dto.js";

const METHODS: CashPaymentMethod[] = [
  "CASH",
  "WAVE",
  "ORANGE_MONEY",
  "FREE_MONEY",
  "BANK",
  "OTHER",
];

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const positiveAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("Opération financière invalide");
  }
  return amount;
};

export const CashSchemas = {
  open: (input: Record<string, unknown>): OpenCashDto => ({
    openingAmount: positiveAmount(input.openingAmount),
    note: optionalText(input.note),
  }),

  close: (input: Record<string, unknown>): CloseCashDto => ({
    note: optionalText(input.note),
  }),

  id: (value: unknown): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Identifiant invalide");
    }
    return id;
  },

  transaction: (input: Record<string, unknown>): CreateCashTransactionDto => {
    const type = input.type === "IN" || input.type === "OUT" ? input.type : null;
    if (!type) throw new BadRequestError("Transaction invalide");

    const label = optionalText(input.label);
    if (!label) throw new BadRequestError("Transaction invalide");

    const rawMethod = optionalText(input.paymentMethod) ?? "CASH";
    const paymentMethod = METHODS.includes(rawMethod as CashPaymentMethod)
      ? (rawMethod as CashPaymentMethod)
      : "CASH";

    return {
      type,
      amount: positiveAmount(input.amount),
      label,
      reference: optionalText(input.reference),
      paymentMethod,
    };
  },

  historyQuery: (input: Record<string, unknown>): CashHistoryQueryDto => {
    const page = input.page === undefined ? 1 : Number(input.page);
    const limit = input.limit === undefined ? 15 : Number(input.limit);
    if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestError("Paramètres de pagination invalides");
    }
    return { page, limit };
  },
};
