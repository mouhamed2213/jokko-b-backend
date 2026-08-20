import { BadRequestError } from "../../utils/errors.js";
import type { CreateCategoryDto } from "./category.dto.js";

export const CategorySchemas = {
  create: (input: Record<string, unknown>): CreateCategoryDto => {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new BadRequestError("Le nom est obligatoire");
    }
    return { name };
  },

  id: (value: unknown): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Identifiant catégorie invalide");
    }
    return id;
  },
};
