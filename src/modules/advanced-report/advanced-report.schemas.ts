import { BadRequestError } from "../../utils/errors.js";
import type { AdvancedReportQueryDto } from "./advanced-report.dto.js";

const dateValue = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestError(`Filtre ${label} invalide`);
  return date;
};

const positiveId = (value: unknown, label: string) => {
  if (value === undefined) return undefined;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError(`Filtre ${label} invalide`);
  return id;
};

export const AdvancedReportSchemas = {
  query: (query: Record<string, unknown>): AdvancedReportQueryDto => {
    const from = dateValue(query.from, "de date");
    const to = dateValue(query.to, "à date");
    if (from && to && from > to) throw new BadRequestError("Période invalide");
    if (from && to && to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestError("Période trop longue");
    }
    const rawGranularity = query.granularity;
    const granularity = rawGranularity === undefined ? "day" : String(rawGranularity);
    if (granularity !== "day" && granularity !== "week" && granularity !== "month") {
      throw new BadRequestError("Granularité invalide");
    }
    return {
      from,
      to,
      granularity,
      categoryId: positiveId(query.categoryId, "catégorie"),
      userId: positiveId(query.userId, "utilisateur"),
    };
  },
};
