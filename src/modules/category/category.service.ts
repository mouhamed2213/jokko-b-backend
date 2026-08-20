import { AppError, NotFoundError } from "../../utils/errors.js";
import type { CreateCategoryDto } from "./category.dto.js";
import { CategoryRepository } from "./category.repository.js";

const isPrismaUniqueError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
};

export const CategoryService = {
  getCategories: async (shopId: number) => {
    return CategoryRepository.findManyByShop(shopId);
  },

  createCategory: async (shopId: number, data: CreateCategoryDto) => {
    try {
      return await CategoryRepository.create(shopId, data);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new AppError("Cette catégorie existe déjà", 400);
      }
      throw error;
    }
  },

  deleteCategory: async (shopId: number, id: number) => {
    const existing = await CategoryRepository.findByIdAndShop(id, shopId);
    if (!existing) {
      throw new NotFoundError("Catégorie introuvable");
    }

    await CategoryRepository.delete(id);
  },
};
