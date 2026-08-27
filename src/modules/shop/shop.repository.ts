import { prisma } from "../../config/prisma.js";
import type { PlanType } from "../../database/prisma/generated/prisma/enums.js";
import { AppError } from "../../utils/errors.js";

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

  findByEmail: async (email: string) => {
    return prisma.shop.findUnique({ where: { email } });
  },

  findUserByIdWithShop: async (userId: number) => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, shop: { select: { id: true } } },
    });
  },

  findUserByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  findOwnedShops: async (ownerId: number) => {
    return prisma.shopOwner.findMany({
      where: { userId: ownerId },
      select: {
        shop: {
          select: {
            id: true,
            ownerName: true,
            name: true,
            address: true,
            logoUrl: true,
            currentShop: true,
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { plan: { select: { code: true } } },
            },
          },
        },
      },
    });
  },

  createPrimaryShop: async (data: {
    shopName: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string | null;
    hashedPassword: string;
    planType: PlanType;
    endDate: Date | null;
    subscriptionStatus: "ACTIVE" | "TRIAL";
  }) => {
    return prisma.$transaction(async (tx) => {
      const newShop = await tx.shop.create({
        data: {
          name: data.shopName,
          ownerName: data.ownerName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          currentShop: "PRIMARY",
        },
      });

      const plan = await tx.plan.findUnique({
        where: { code: data.planType },
      });

      if (!plan) {
        return null;
      }

      const actor = await tx.user.create({
        data: {
          shopId: newShop.id,
          name: data.ownerName,
          email: data.email,
          password: data.hashedPassword,
          role: "ADMIN",
        },
      });

      const owner = await tx.shopOwner.create({
        data: {
          userId: actor.id,
          shopId: newShop.id,
          phone: newShop.phone,
        },
      });

      await tx.subscription.create({
        data: {
          shopId: owner.shopId,
          shopOwnerId: owner.id,
          planId: plan.id,
          status: data.subscriptionStatus,
          endDate: data.endDate,
        },
      });

      return newShop;
    });
  },

  createSecondaryShop: async (data: {
    shopName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    primaryShopId: number;
    ownerId: number;
    planCode: PlanType;
    endDate: Date | null;
  }) => {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${data.primaryShopId})`;
      const plan = await tx.plan.findUnique({ where: { code: data.planCode } });
      if (!plan) return null;
      const ownedShopCount = await tx.shop.count({ where: { OR: [{ id: data.primaryShopId }, { primaryShopId: data.primaryShopId }] } });
      if (plan.maxStores !== null && ownedShopCount >= plan.maxStores) {
        throw new AppError(`Limite de boutiques atteinte (${plan.maxStores})`, 403);
      }
      const shop = await tx.shop.create({
        data: {
          name: data.shopName,
          ownerName: data.ownerName,
          email: data.email,
          primaryShopId: data.primaryShopId,
          currentShop: "SECONDARY",
          phone: data.phone,
        },
      });

      const actor = await tx.user.create({
        data: {
          shopId: shop.id,
          name: data.ownerName,
          email: data.email,
          password: data.password,
          role: "ADMIN",
        },
      });

      const owner = await tx.shopOwner.create({
        data: {
          userId: data.ownerId,
          shopId: shop.id,
          phone: shop.phone,
        },
      });

      await tx.subscription.create({
        data: {
          shopOwnerId: owner.userId,
          shopId: owner.shopId,
          planId: plan.id,
          status: "ACTIVE",
          endDate: data.endDate,
        },
      });

      return shop;
    });
  },

  findSettings: async (shopId: number) => {
    return prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: { users: true, products: true, sales: true, clients: true },
        },
      },
    });
  },

  updateSettings: async (
    shopId: number,
    ownerId: number,
    data: {
      name: string;
      ownerName: string;
      phone: string;
      address: string | null;
    },
  ) => {
    return prisma.$transaction(async (tx) => {
      const shop = await tx.shop.update({
        where: { id: shopId },
        data,
      });

      await tx.shopOwner.updateMany({
        where: { shopId, userId: ownerId },
        data: { phone: shop.phone },
      });

      return shop;
    });
  },

  updateLogo: async (shopId: number, logoPath: string) => {
    return prisma.shop.update({
      where: { id: shopId },
      data: { logoUrl: logoPath },
    });
  },

  findLogo: async (shopId: number) => {
    return prisma.shop.findUnique({
      where: { id: shopId },
      select: { logoUrl: true },
    });
  },

  deleteLogo: async (shopId: number) => {
    return prisma.shop.update({
      where: { id: shopId },
      data: { logoUrl: null },
    });
  },
};
