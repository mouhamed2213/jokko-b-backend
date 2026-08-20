import { prisma } from "../../config/prisma.js";

export const AuthRepository = {
  findUserByShop: async (userId: number, shopId: number) => {
    return prisma.user.findUnique({
      where: { id: userId, shopId },
      select: { id: true },
    });
  },

  findShopWithSubscription: async (shopId: number) => {
    return prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: {
          include: {
            plan: {
              include: {
                planFeature: {
                  include: { feature: true },
                },
              },
            },
          },
        },
      },
    });
  },

  findUserForLogin: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
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

  findShopOwner: async (shopId: number) => {
    return prisma.shopOwner.findFirst({
      where: { shopId },
    });
  },
};
