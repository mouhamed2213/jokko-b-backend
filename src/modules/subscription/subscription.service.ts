import { Prisma } from "../../database/prisma/generated/prisma/client.js";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import type {
  CurrentSubscriptionDto,
  SecondaryShopEligibility,
} from "./subscription.dto.js";
import { SubscriptionRepository } from "./subscription.repository.js";

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: {
    plan: {
      include: {
        planFeature: {
          include: { feature: true };
        };
      };
    };
  };
}>;

const toSubscriptionDto = (
  subscription: SubscriptionWithPlan,
): CurrentSubscriptionDto => ({
  id: subscription.id,
  status: subscription.status,
  endDate: subscription.endDate,
  plan: {
    code: subscription.plan.code,
    name: subscription.plan.name,
  },
  limits: {
    sales: subscription.plan.maxSalesPerMonth,
    products: subscription.plan.maxProducts,
    customers: subscription.plan.maxCustomers,
    users: subscription.plan.maxUsers,
    stores: subscription.plan.maxStores,
  },
  features: subscription.plan.planFeature.map(
    (planFeature) => planFeature.feature.code,
  ),
});

export const SubscriptionService = {
  currentSubscription: async (
    shopId: number,
    shopOwnerId: number,
  ): Promise<CurrentSubscriptionDto> => {
    const subscription =
      await SubscriptionRepository.findCurrentByOwnerAndShop(
        shopOwnerId,
        shopId,
      );

    if (!subscription) {
      throw new NotFoundError("No active subscription");
    }

    if (
      subscription.plan.code !== "FREE" &&
      subscription.endDate &&
      subscription.endDate <= new Date()
    ) {
      const freePlan = await SubscriptionRepository.findFreePlan();

      if (!freePlan) {
        throw new NotFoundError("Free plan not found");
      }

      const status =
        subscription.status === "TRIAL" ? "TRIAL_EXPIRED" : "EXPIRED";

      const downgraded = await SubscriptionRepository.downgradeToFree(
        subscription.id,
        shopId,
        shopOwnerId,
        freePlan.id,
        status,
      );

      return toSubscriptionDto(downgraded);
    }

    return toSubscriptionDto(subscription);
  },

  assertCanCreateSecondaryShop: async (
    ownerId: number,
    actorId: number,
  ): Promise<SecondaryShopEligibility> => {
    const actor = await SubscriptionRepository.findActor(actorId);

    if (actor?.role !== "ADMIN") {
      throw new ForbiddenError(
        "Seul l'administrateur peut crée une nouvelle boutique",
      );
    }

    const owner = await SubscriptionRepository.findOwnerContext(ownerId);

    if (!owner) {
      throw new NotFoundError("User not found");
    }

    const subscription = owner.shop.subscriptions[0];

    if (!subscription) {
      throw new NotFoundError("No active subscription");
    }

    const planCode = subscription.plan.code;

    if (planCode !== "PREMIUM" && planCode !== "PRO") {
      throw new ForbiddenError(
        "Cette abonnement ne contient l'option multi-boutique",
      );
    }

    if (subscription.status === "TRIAL") {
      throw new ForbiddenError(
        "Le plan d'essai ne permet pas de créer une nouvelle boutique",
      );
    }

    const ownedShops = await SubscriptionRepository.countOwnedShops(ownerId);
    const maxStores = subscription.plan.maxStores ?? 1;

    if (ownedShops >= maxStores) {
      throw new UnauthorizedError(`Limite de boutiques atteinte (${maxStores})`);
    }

    return {
      ownerId,
      actorId,
      planCode,
      maxStores,
      ownedShops,
      subscriptionStatus: subscription.status,
      endDate: subscription.endDate,
    };
  },
};
