import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateSaleDto,
  InvoiceListQueryDto,
  SaleItemDto,
  SaleListQueryDto,
  SalePaymentDto,
  UpdateSaleDto,
} from "./sale.dto.js";

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

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

const nonNegativeNumber = (value: unknown, message: string): number => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new BadRequestError(message);
  }
  return number;
};

const parseItems = (value: unknown): SaleItemDto[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestError("Au moins un article est requis");
  }

  return value.map((item) => {
    const input = item as Record<string, unknown>;
    return {
      productId: positiveInteger(input.productId, "Article invalide"),
      quantity: positiveNumber(input.quantity, "Quantité invalide"),
      unitPrice: nonNegativeNumber(input.unitPrice, "Prix invalide"),
    };
  });
};

const parsePaymentMethod = (value: unknown): string => {
  const method = optionalText(value);
  return method || "CASH";
};

export const SaleSchemas = {
  create: (input: Record<string, unknown>): CreateSaleDto => ({
    clientId:
      input.clientId === undefined || input.clientId === null || input.clientId === ""
        ? undefined
        : positiveInteger(input.clientId, "Client invalide"),
    customerName: optionalText(input.customerName),
    paidAmount:
      input.paidAmount === undefined || input.paidAmount === null || input.paidAmount === ""
        ? undefined
        : nonNegativeNumber(input.paidAmount, "Montant payé invalide"),
    paymentMethod: parsePaymentMethod(input.paymentMethod),
    items: parseItems(input.items),
    note: optionalText(input.note),
  }),

  update: (input: Record<string, unknown>): UpdateSaleDto => ({
    clientId:
      input.clientId === undefined || input.clientId === null || input.clientId === ""
        ? null
        : positiveInteger(input.clientId, "Client invalide"),
    customerName: optionalText(input.customerName),
    items: parseItems(input.items),
    note: optionalText(input.note),
  }),

  payment: (input: Record<string, unknown>): SalePaymentDto => ({
    amount: positiveNumber(input.amount, "Montant payé invalide"),
    note: optionalText(input.note),
    paymentMethod: parsePaymentMethod(input.paymentMethod),
  }),

  id: (value: unknown): number => positiveInteger(value, "Identifiant invalide"),

  list: (input: Record<string, unknown>): SaleListQueryDto => ({
    status: optionalText(input.status),
    clientId:
      input.clientId === undefined || input.clientId === ""
        ? undefined
        : positiveInteger(input.clientId, "Client invalide"),
    search: optionalText(input.search),
    page: input.page === undefined ? 1 : positiveInteger(input.page, "Page invalide"),
    limit: input.limit === undefined ? 20 : positiveInteger(input.limit, "Limite invalide"),
  }),

  invoices: (input: Record<string, unknown>): InvoiceListQueryDto => ({
    status: optionalText(input.status),
    search: optionalText(input.search),
    dateFrom: optionalText(input.dateFrom),
    dateTo: optionalText(input.dateTo),
    page: input.page === undefined ? 1 : positiveInteger(input.page, "Page invalide"),
    limit: input.limit === undefined ? 20 : positiveInteger(input.limit, "Limite invalide"),
  }),
};
