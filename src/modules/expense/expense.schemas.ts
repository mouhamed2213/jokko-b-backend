import { BadRequestError } from "../../utils/errors.js";
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseDto,
  type ExpenseCategory,
  type ExpenseListQueryDto,
} from "./expense.dto.js";

const optionalText = (value: unknown, maxLength = 500): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length > maxLength) throw new BadRequestError("Requête invalide");
  return text;
};

const positiveAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("Opération financière invalide");
  }
  return amount;
};

const category = (value: unknown): ExpenseCategory => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!EXPENSE_CATEGORIES.includes(normalized as ExpenseCategory)) {
    throw new BadRequestError("Catégorie de dépense invalide");
  }
  return normalized as ExpenseCategory;
};

export const ExpenseSchemas = {
  id: (value: unknown): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError("Identifiant invalide");
    return id;
  },

  create: (input: Record<string, unknown>): CreateExpenseDto => ({
    category: category(input.category),
    amount: positiveAmount(input.amount),
    description: optionalText(input.description),
    reference: optionalText(input.reference, 120),
    paymentMethod: optionalText(input.paymentMethod, 40) || "CASH",
  }),

  listQuery: (input: Record<string, unknown>): ExpenseListQueryDto => {
    const page = input.page === undefined ? 1 : Number(input.page);
    const limit = input.limit === undefined ? 20 : Number(input.limit);
    if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new BadRequestError("Paramètres de pagination invalides");
    }

    const selectedCategory = input.category === undefined ? undefined : category(input.category);
    const from = input.from ? new Date(String(input.from)) : undefined;
    const to = input.to ? new Date(String(input.to)) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw new BadRequestError("Période invalide");
    }
    if (from && to && from > to) throw new BadRequestError("Période invalide");

    return { page, limit, category: selectedCategory, from, to };
  },
};
