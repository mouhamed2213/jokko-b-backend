import { prisma } from "../../config/prisma.js";

export const StockTransferRepository = {
  ownedShop: (userId: number, shopId: number) =>
    prisma.shopOwner.findFirst({ where: { userId, shopId } }),

  findProductsByIdsAndShop: (ids: number[], shopId: number) =>
    prisma.product.findMany({ where: { id: { in: ids }, shopId, isActive: true } }),

  findProductByReferenceOrName: (shopId: number, reference: string | null, name: string) =>
    prisma.product.findFirst({
      where: {
        shopId,
        isActive: true,
        OR: [
          ...(reference ? [{ reference }] : []),
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    }),

  findManyByShop: (shopId: number, query: { status?: string; page: number; limit: number }) =>
    prisma.stockTransfer.findMany({
      where: {
        OR: [{ sourceShopId: shopId }, { destinationShopId: shopId }],
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        sourceShop: { select: { id: true, name: true } },
        destinationShop: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),

  findById: (id: number) =>
    prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceShop: { select: { id: true, name: true } },
        destinationShop: { select: { id: true, name: true } },
        items: true,
      },
    }),

  create: (data: {
    sourceShopId: number;
    destinationShopId: number;
    createdById: number;
    reference: string;
    note?: string;
    items: Array<{ sourceProductId: number; destinationProductId: number; productName: string; quantity: number }>;
  }) =>
    prisma.stockTransfer.create({
      data: {
        sourceShopId: data.sourceShopId,
        destinationShopId: data.destinationShopId,
        createdById: data.createdById,
        reference: data.reference,
        note: data.note,
        items: { create: data.items },
      },
      include: { items: true },
    }),
};
