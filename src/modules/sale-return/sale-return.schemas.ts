import { BadRequestError } from "../../utils/errors.js";
import type { CreateSaleReturnDto } from "./sale-return.dto.js";

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

export const SaleReturnSchemas = {
  id: (value: unknown): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Requête invalide");
    }
    return id;
  },

  create: (input: Record<string, unknown>): CreateSaleReturnDto => {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestError("Données de retour invalides");
    }

    const items = input.items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") {
        throw new BadRequestError("Données de retour invalides");
      }
      const item = rawItem as Record<string, unknown>;
      const saleItemId = Number(item.saleItemId);
      const quantity = Number(item.quantity);
      if (
        !Number.isInteger(saleItemId) ||
        saleItemId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new BadRequestError("Données de retour invalides");
      }
      return { saleItemId, quantity };
    });

    const uniqueIds = new Set(items.map((item) => item.saleItemId));
    if (uniqueIds.size !== items.length) {
      throw new BadRequestError("Données de retour invalides");
    }

    return {
      items,
      reason: optionalText(input.reason),
    };
  },
};
