import { prisma } from "../../config/prisma.js";
import type {
  CreateProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from "./product.dto.js";

const productInclude = { category: true } as const;

export const ProductRepository = {
  findOwnership: async (ownerUserId: number, shopId: number) => {
    return prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerUserId, shopId } },
      select: { id: true, userId: true, shopId: true },
    });
  },

  countByShop: async (shopId: number) => {
    return prisma.product.count({ where: { shopId } });
  },

  findImportConflicts: async (
    shopId: number,
    names: string[],
    references: string[],
  ) => prisma.product.findMany({
    where: {
      shopId,
      isActive: true,
      OR: [
        ...(names.length ? [{ name: { in: names } }] : []),
        ...(references.length ? [{ reference: { in: references } }] : []),
      ],
    },
    select: { id: true, name: true, reference: true },
  }),

  countByQuery: async (shopId: number, query: ProductListQueryDto) => {
    const where = {
      shopId,
      isActive: true,
      ...(query.search ? { name: { contains: query.search } } : {}),
      ...(query.categoryId !== undefined
        ? { categoryId: query.categoryId }
        : {}),
    };

    return prisma.product.count({ where });
  },

  findManyByShop: async (shopId: number, query: ProductListQueryDto) => {
    const where = {
      shopId,
      isActive: true,
      ...(query.search ? { name: { contains: query.search } } : {}),
      ...(query.categoryId !== undefined
        ? { categoryId: query.categoryId }
        : {}),
    };

    return prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  },

  findByIdAndShop: async (id: number, shopId: number) => {
    return prisma.product.findFirst({
      where: { id, shopId },
      include: productInclude,
    });
  },

  findPriceByIdAndShop: async (id: number, shopId: number) => {
    return prisma.product.findFirst({
      where: { id, shopId },
      select: {
        salePrice: true,
        semiWholesalePrice: true,
        semiWholesaleMinQty: true,
        wholesalePrice: true,
        wholesaleMinQty: true,
      },
    });
  },

  create: async (shopId: number, data: CreateProductDto) => {
    return prisma.product.create({
      data: {
        shopId,
        name: data.name,
        description: data.description || null,
        reference: data.reference || null,
        categoryId: data.categoryId ?? null,
        quantity: 0,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        alertThreshold: data.alertThreshold,
        imageUrl: data.imageUrl || null,
        semiWholesalePrice: data.semiWholesalePrice ?? null,
        semiWholesaleMinQty: data.semiWholesaleMinQty ?? null,
        wholesalePrice: data.wholesalePrice ?? null,
        wholesaleMinQty: data.wholesaleMinQty ?? null,
      },
      include: productInclude,
    });
  },

  update: async (id: number, data: UpdateProductDto) => {
    return prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });
  },

  softDelete: async (id: number) => {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  },

  findLowStockByShop: async (shopId: number) => {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true, quantity: { gt: 0 } },
      include: productInclude,
    });

    return products.filter((product) => product.quantity <= product.alertThreshold);
  },

  findOutOfStockByShop: async (shopId: number) => {
    return prisma.product.findMany({
      where: { shopId, isActive: true, quantity: 0 },
      include: productInclude,
      orderBy: { updatedAt: "desc" },
    });
  },
};
