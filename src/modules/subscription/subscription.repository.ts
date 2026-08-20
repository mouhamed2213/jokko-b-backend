import { prisma } from "../../config/prisma.js";

export const SubscriptionRepository = {
  findCurrentByOwnerAndShop: async (shopOwnerId: number, shopId: number) => {
    return prisma.subscription.findFirst({
      where: { shopOwnerId, shopId },
      include: {
        plan: {
          include: {
            planFeature: {
              include: { feature: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findFreePlan: async () => {
    return prisma.plan.findUnique({ where: { code: "FREE" } });
  },

  downgradeToFree: async (
    subscriptionId: number,
    shopId: number,
    shopOwnerId: number,
    freePlanId: number,
    status: "EXPIRED" | "TRIAL_EXPIRED",
  ) => {
    return prisma.subscription.update({
      where: { id: subscriptionId, shopId, shopOwnerId },
      data: {
        planId: freePlanId,
        status,
        endDate: null,
      },
      include: {
        plan: {
          include: {
            planFeature: {
              include: { feature: true },
            },
          },
        },
      },
    });
  },

  findOwnerContext: async (ownerId: number) => {
    return prisma.user.findUnique({
      where: { id: ownerId },
      include: {
        shop: {
          include: {
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { plan: true },
            },
          },
        },
      },
    });
  },

  findActor: async (actorId: number) => {
    return prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true },
    });
  },

  countOwnedShops: async (ownerId: number) => {
    return prisma.shopOwner.count({ where: { userId: ownerId } });
  },
};
