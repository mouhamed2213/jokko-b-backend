import { prisma } from "../../config/prisma.js";

const stockFields = {
  id: true,
  name: true,
  quantity: true,
  alertThreshold: true,
} as const;

export const NotificationRepository = {
  findProductsForStream: async (shopId: number) =>
    prisma.product.findMany({
      where: { shopId, isActive: true },
      select: stockFields,
      orderBy: { name: "asc" },
    }),

  findProductsForStockAlerts: async (shopId: number) =>
    prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        ...stockFields,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
};
