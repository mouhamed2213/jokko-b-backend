import { BadRequestError } from "../../utils/errors.js";
import type { PaymentInputDto } from "./payment.dto.js";

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

export const PaymentSchemas = {
  id: (value: unknown, label = "Identifiant paiement"): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Identifiant invalide");
    }
    return id;
  },

  payment: (input: Record<string, unknown>): PaymentInputDto => ({
    amount: positiveAmount(input.amount),
    ...(optionalText(input.note) ? { note: optionalText(input.note) } : {}),
    paymentMethod: optionalText(input.paymentMethod) ?? "CASH",
  }),
};
