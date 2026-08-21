import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateSupplierDebtDto,
  CreateSupplierDto,
  CreateSupplierPaymentDto,
  UpdateSupplierDto,
} from "./supplier.dto.js";

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const nullableText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const positiveAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("Opération financière invalide");
  }
  return amount;
};

const nonNegativeAmount = (value: unknown): number => {
  if (value === undefined || value === null || value === "") return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestError("Opération financière invalide");
  }
  return amount;
};

export const SupplierSchemas = {
  id: (value: unknown, label = "Identifiant fournisseur"): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Identifiant invalide");
    }
    return id;
  },

  create: (input: Record<string, unknown>): CreateSupplierDto => {
    const name = optionalText(input.name);
    if (!name) throw new BadRequestError("Données fournisseur invalides");

    return {
      name,
      ...(optionalText(input.phone) ? { phone: optionalText(input.phone) } : {}),
      ...(optionalText(input.email) ? { email: optionalText(input.email) } : {}),
      ...(optionalText(input.address)
        ? { address: optionalText(input.address) }
        : {}),
    };
  },

  update: (input: Record<string, unknown>): UpdateSupplierDto => {
    const data: UpdateSupplierDto = {};
    if (input.name !== undefined) {
      const name = optionalText(input.name);
      if (!name) throw new BadRequestError("Données fournisseur invalides");
      data.name = name;
    }
    if (input.phone !== undefined) data.phone = nullableText(input.phone);
    if (input.email !== undefined) data.email = nullableText(input.email);
    if (input.address !== undefined) data.address = nullableText(input.address);
    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Aucune modification fournie");
    }
    return data;
  },

  debt: (input: Record<string, unknown>): CreateSupplierDebtDto => {
    const totalAmount = positiveAmount(input.totalAmount);
    const paidAmount = nonNegativeAmount(input.paidAmount);
    if (paidAmount > totalAmount) {
      throw new BadRequestError("Opération financière invalide");
    }

    const note = optionalText(input.note);
    return {
      totalAmount,
      paidAmount,
      ...(note ? { note } : {}),
      paymentMethod: optionalText(input.paymentMethod) ?? "CASH",
    };
  },

  payment: (input: Record<string, unknown>): CreateSupplierPaymentDto => {
    const note = optionalText(input.note);
    return {
      amount: positiveAmount(input.amount),
      ...(note ? { note } : {}),
      paymentMethod: optionalText(input.paymentMethod) ?? "CASH",
    };
  },
};
