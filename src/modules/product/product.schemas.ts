import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from "./product.dto.js";

const parseOptionalNumber = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${field} invalide`);
  }

  return parsed;
};

const parseNullableNumber = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${field} invalide`);
  }

  return parsed;
};

const parseRequiredNumber = (value: unknown, field: string): number => {
  const parsed = parseOptionalNumber(value, field);
  if (parsed === undefined) {
    throw new BadRequestError(`${field} obligatoire`);
  }
  return parsed;
};

const parseId = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(`${field} invalide`);
  }

  return parsed;
};

const parseOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return String(value).trim();
};

export const ProductSchemas = {
  id: (value: unknown) => parseId(value, "Identifiant produit"),

  listQuery: (input: Record<string, unknown>): ProductListQueryDto => {
    const page = parseOptionalNumber(input.page, "Page") ?? 1;
    const limit = parseOptionalNumber(input.limit, "Limite") ?? 20;
    const categoryId = parseOptionalNumber(input.categoryId, "Catégorie");

    if (!Number.isInteger(page) || page <= 0) {
      throw new BadRequestError("Page invalide");
    }
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestError("Limite invalide");
    }
    if (categoryId !== undefined && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      throw new BadRequestError("Catégorie invalide");
    }

    return {
      search: typeof input.search === "string" ? input.search : "",
      categoryId,
      page,
      limit,
    };
  },

  create: (input: Record<string, unknown>): CreateProductDto => {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new BadRequestError(
        "Nom, prix d'achat et prix de vente sont obligatoires",
      );
    }

    const purchasePrice = parseOptionalNumber(
      input.purchasePrice,
      "Prix d'achat",
    );
    const salePrice = parseOptionalNumber(input.salePrice, "Prix de vente");

    if (purchasePrice === undefined || salePrice === undefined) {
      throw new BadRequestError(
        "Nom, prix d'achat et prix de vente sont obligatoires",
      );
    }

    return {
      name,
      description: parseOptionalText(input.description),
      reference: parseOptionalText(input.reference),
      categoryId: parseNullableNumber(input.categoryId, "Catégorie"),
      purchasePrice,
      salePrice,
      alertThreshold:
        parseOptionalNumber(input.alertThreshold, "Seuil d'alerte") ?? 5,
      imageUrl: input.imageUrl ? String(input.imageUrl) : null,
      semiWholesalePrice: parseNullableNumber(
        input.semiWholesalePrice,
        "Prix demi-gros",
      ),
      semiWholesaleMinQty: parseNullableNumber(
        input.semiWholesaleMinQty,
        "Quantité minimale demi-gros",
      ),
      wholesalePrice: parseNullableNumber(
        input.wholesalePrice,
        "Prix gros",
      ),
      wholesaleMinQty: parseNullableNumber(
        input.wholesaleMinQty,
        "Quantité minimale gros",
      ),
    };
  },

  update: (input: Record<string, unknown>): UpdateProductDto => {
    const data: UpdateProductDto = {};

    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) throw new BadRequestError("Nom invalide");
      data.name = name;
    }
    if (input.description !== undefined) {
      data.description = input.description ? String(input.description).trim() : null;
    }
    if (input.reference !== undefined) {
      data.reference = input.reference ? String(input.reference).trim() : null;
    }
    if (input.categoryId !== undefined) {
      data.categoryId = parseNullableNumber(input.categoryId, "Catégorie");
    }

    const requiredNumericFields = [
      ["purchasePrice", "Prix d'achat"],
      ["salePrice", "Prix de vente"],
      ["alertThreshold", "Seuil d'alerte"],
    ] as const;

    for (const [key, label] of requiredNumericFields) {
      if (input[key] !== undefined) {
        (data as Record<string, unknown>)[key] = parseRequiredNumber(
          input[key],
          label,
        );
      }
    }

    const nullableNumericFields = [
      ["semiWholesalePrice", "Prix demi-gros"],
      ["semiWholesaleMinQty", "Quantité minimale demi-gros"],
      ["wholesalePrice", "Prix gros"],
      ["wholesaleMinQty", "Quantité minimale gros"],
    ] as const;

    for (const [key, label] of nullableNumericFields) {
      if (input[key] !== undefined) {
        (data as Record<string, unknown>)[key] = parseNullableNumber(
          input[key],
          label,
        );
      }
    }

    if (input.imageUrl !== undefined) {
      data.imageUrl = input.imageUrl ? String(input.imageUrl) : null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Aucune modification fournie");
    }

    return data;
  },

  quantity: (value: unknown): number => {
    const quantity = Number(value) || 1;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestError("Quantité invalide");
    }
    return quantity;
  },
};
