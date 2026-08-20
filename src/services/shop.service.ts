import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.js";

import {
  CurrentShopType,
  PlanType,
  SubscriptionStatus,
} from "../database/prisma/generated/prisma/enums.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.js";
import { env } from "../config/env-config.js";
import { ShopService as DomainShopService } from "../modules/shop/shop.service.js";

import { getFullStorageUrl } from "../utils/file-upload.js";
import { LOGO_BUCKET } from "../config/storage.config.js";
import { SubscriptionService as DomainSubscriptionService } from "../modules/subscription/subscription.service.js";

export const ShopService = {
  switchShop: DomainShopService.switchShop,

  createShop: async (
    shopName: string,
    ownerName: string,
    email: string,
    phone: string,
    address: string | null,
    hashedPassword: string,
    planType: PlanType,
  ) => {
    try {
      let endDate: Date | null;
      let subscriptionStatus: SubscriptionStatus;

      //  all plan except free has a 15 days free trial
      if (planType !== "FREE") {
        endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        subscriptionStatus = "TRIAL";
      } else {
        endDate = null;
        subscriptionStatus = "ACTIVE";
      }

      const shop = await prisma.$transaction(async (tx) => {
        // Create shop
        const newShop = await tx.shop.create({
          data: {
            name: shopName,
            ownerName,
            email,
            phone: phone,
            address: address || null,
            currentShop: "PRIMARY",
          },
        });

        
        // Find existing plan
        const plan = await tx.plan.findUnique({
          where: {
            code: planType,
          },
        });
        
        if (!plan) {
          throw new NotFoundError("Plan not found");
        }
     
        // Create subscription

        const actor = await tx.user.create({
          data: {
            shopId: newShop.id,
            name: ownerName,
            email,
            password: hashedPassword,
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
            status: subscriptionStatus,
            endDate,
          },
        });

        return newShop;
      });
      return shop;
    } catch (e) {
      console.error("Error while creating a shop");
      throw e;
    }
  },

  createSecondaryShop: async (
    ownerId: number,
    actorId: number,
    shopData: {
      shopName: string;
      ownerName: string;
      address: string;
      phone: string;
      email: string;
      password: string;
    },
  ) => {
    try {
      const eligibility =
        await DomainSubscriptionService.assertCanCreateSecondaryShop(
          ownerId,
          actorId,
        );

      const shopOwner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, shop: { select: { id: true } } },
      });

      if (!shopOwner) {
        throw new NotFoundError("User not found");
      }

      const checkIsEmailExist = await prisma.user.findUnique({
        where: { email: shopData.email },
      });
      if (checkIsEmailExist) {
        throw new ConflictError("Cette address mail exist déja");
      }

      const planCode = eligibility.planCode;
      const endDate = eligibility.endDate;

      //  create
      const newShop = await prisma.$transaction(async (tx) => {
        const shop = await tx.shop.create({
          data: {
            name: shopData.shopName,
            ownerName: shopData.ownerName,
            email: shopData.email,
            primaryShopId: shopOwner?.shop.id,
            currentShop: "SECONDARY",
            phone: shopData.phone,
          },
        });

        const plan = await tx.plan.findUnique({
          where: { code: planCode },
        });

        if (!plan) {
          throw new NotFoundError(`Plan not found: ${planCode}`);
        }

        await tx.user.create({
          data: {
            shopId: shop.id,
            name: shopData.ownerName,
            email: shopData.email,
            password: shopData.password, //is already hashed
            role: "ADMIN",
          },
        });

        // Lier au owner principal pour le switch
        const owner = await tx.shopOwner.create({
          data: {
            userId: shopOwner.id,
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
            endDate, // end date of the primary shop
          },
        });

        return shop;
      });

      return newShop;
    } catch (e) {
      logger.error(`Error while creating secondarye shop for user xxx`);
      throw e;
    }
  },

  find: async (email: string) => {
    try {
      return await prisma.shop.findUnique({ where: { email } });
    } catch (e) {
      console.error("Cannot find shop");
      throw e;
    }
  },

  // getShop
  getShops: async (ownerId: number) => {
    // check shop onwer
    const ownership = await prisma.shopOwner.findMany({
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
              select: {
                plan: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    if (ownership.length <= 0) {
      throw new ForbiddenError("Access interdit");
    }

    const shops = ownership.map((s) => ({
      id: s.shop.id,
      shopOwner: ownerId,
      actorName: s.shop.ownerName,
      name: s.shop.name,
      plan: s.shop.subscriptions[0].plan.code,
      address: s.shop.address,
      logoUrl:  getFullStorageUrl(LOGO_BUCKET, s.shop.logoUrl),
      currentShop: s.shop.currentShop,
    }));

    return shops;
  },

  // Switch to another shop
    switchShopLegacy: async (

    shopOwnerId: number,
    shopData: {
      userId: number; // should retrieve from the jwt
      password: string;
      targetShopId: number;
    },
  ) => {
    // owner verification
    const ownership = await prisma.shopOwner.findFirst({
      where: {
        userId: shopOwnerId,
        shopId: shopData.targetShopId,
      },
    });

    if (!ownership) {
      throw new UnauthorizedError("Accée non autorisé");
    }
    const actor = await prisma.user.findFirst({
      where: {
        // id: shopData.userId,
        shopId: shopData.targetShopId,
      },
      include: {
        shop: {
          select: {
            status: true,
            name: true,
            subscriptions: { select: { plan: { select: { code: true } } } },
          },
        },
      },
    });

    if (!actor) {
      throw new NotFoundError("Utillsateur non reconnu");
    }

    let plan = actor.shop.subscriptions[0].plan.code;

    // if (plan !== "PRO" && plan !== "PREMIUM") {
    //   throw new UnauthorizedError(
    //     " Votre abonnment n'inclut pas cette fonctionnalitée",
    //   );
    // }

    const isPasswordValid = await bcrypt.compare(
      shopData.password,
      actor?.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Mot de passe incorrect");
    }

    const token = jwt.sign(
      {
        ownerId: ownership.userId, // the shop owner id . it's immuable and is always in every token
        userId: actor.id, // user who is connected TO A SHOP maybe primary or secondary
        shopId: actor.shopId,
        plan: actor.shop.subscriptions[0].plan.code === "FREE",
        role: actor.role,
      },
      env.secret.jwt,
      { expiresIn: "1d" },
    );

    // });
    return {
      token,
      user: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        plan: actor.shop.subscriptions[0].plan.code,
        shopId: actor.shopId,
        shopName: actor.shop.name,
      },
    };
  },
};
