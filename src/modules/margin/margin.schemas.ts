import { BadRequestError } from "../../utils/errors.js";
import type { MarginQueryDto } from "./margin.dto.js";

const parseDate = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestError(`Filtre ${label} invalide`);
  return date;
};

export const MarginSchemas = {
  query: (query: Record<string, unknown>): MarginQueryDto => {
    const from = parseDate(query.from, "de date");
    const to = parseDate(query.to, "à date");
    const productId = query.productId === undefined ? undefined : Number(query.productId);
    if (productId !== undefined && (!Number.isInteger(productId) || productId <= 0)) {
      throw new BadRequestError("Filtre produit invalide");
    }
    if (from && to && from > to) throw new BadRequestError("Période invalide");
    if (from && to && to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestError("Période trop longue");
    }
    return { from, to, productId };
  },
};
