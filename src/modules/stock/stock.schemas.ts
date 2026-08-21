import { BadRequestError } from "../../utils/errors.js";
import type {
  StockEntryDto,
  StockMovementQueryDto,
  StockOutDto,
} from "./stock.dto.js";

const positiveInteger = (value: unknown, message: string): number => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequestError(message);
  }
  return number;
};

const positiveNumber = (value: unknown, message: string): number => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new BadRequestError(message);
  }
  return number;
};

const nonNegativeNumber = (value: unknown): number => {
  if (value === undefined || value === null || value === "") return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new BadRequestError("Opération stock invalide");
  }
  return number;
};

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

export const StockSchemas = {
  entry: (input: Record<string, unknown>): StockEntryDto => {
    const supplierId =
      input.supplierId === undefined || input.supplierId === null || input.supplierId === ""
        ? undefined
        : positiveInteger(input.supplierId, "Fournisseur invalide");
    const unitCost =
      input.unitCost === undefined || input.unitCost === null || input.unitCost === ""
        ? undefined
        : positiveNumber(input.unitCost, "Coût unitaire invalide");
    const paidAmount = nonNegativeNumber(input.paidAmount);

    return {
      productId: positiveInteger(input.productId, "Produit invalide"),
      quantity: positiveNumber(input.quantity, "Quantité invalide"),
      ...(supplierId === undefined ? {} : { supplierId }),
      ...(unitCost === undefined ? {} : { unitCost }),
      paidAmount,
      createDebt: input.createDebt === true || input.createDebt === "true",
      note: optionalText(input.note),
    };
  },

  out: (input: Record<string, unknown>): StockOutDto => ({
    productId: positiveInteger(input.productId, "Produit invalide"),
    quantity: positiveNumber(input.quantity, "Quantité invalide"),
    note: optionalText(input.note),
  }),

  id: (value: unknown, label = "Identifiant produit"): number =>
    positiveInteger(value, label),

  query: (input: Record<string, unknown>): StockMovementQueryDto => {
    const page =
      input.page === undefined || input.page === ""
        ? 1
        : positiveInteger(input.page, "Page invalide");
    const limit =
      input.limit === undefined || input.limit === ""
        ? 20
        : positiveInteger(input.limit, "Limite invalide");
    const productId =
      input.productId === undefined || input.productId === ""
        ? undefined
        : positiveInteger(input.productId, "Produit invalide");

    return {
      page,
      limit,
      ...(productId === undefined ? {} : { productId }),
      ...(typeof input.type === "string" && input.type.trim()
        ? { type: input.type.trim() }
        : {}),
    };
  },
};
