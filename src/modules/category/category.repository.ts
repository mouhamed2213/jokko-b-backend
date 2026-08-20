import { prisma } from "../../config/prisma.js";
import type { CreateCategoryDto } from "./category.dto.js";

const categoryInclude = {
  _count: { select: { products: true } },
} as const;

export const CategoryRepository = {
  findManyByShop: async (shopId: number) => {
    return prisma.category.findMany({
      where: { shopId },
      include: categoryInclude,
      orderBy: { name: "asc" },
    });
  },

  create: async (shopId: number, data: CreateCategoryDto) => {
    return prisma.category.create({
      data: { shopId, name: data.name },
      include: categoryInclude,
    });
  },

  findByIdAndShop: async (id: number, shopId: number) => {
    return prisma.category.findFirst({
      where: { id, shopId },
      include: categoryInclude,
    });
  },

  delete: async (id: number) => {
    return prisma.category.delete({ where: { id } });
  },
};
