import { prisma } from "../../config/prisma.js";

export const ShopRepository = {
  findOwnership: async (ownerId: number, shopId: number) => {
    return prisma.shopOwner.findFirst({
      where: { userId: ownerId, shopId },
    });
  },

  findTargetUser: async (shopId: number) => {
    return prisma.user.findFirst({
      where: { shopId },
      include: {
        shop: {
          select: {
            status: true,
            name: true,
            subscriptions: {
              select: { plan: { select: { code: true } } },
            },
          },
        },
      },
    });
  },
};
