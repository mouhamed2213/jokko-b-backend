import type { FeatureCode, PlanType, SubscriptionStatus } from "../../database/prisma/generated/prisma/enums.js";

export type SubscriptionLimitsDto = {
  sales: number | null;
  products: number | null;
  customers: number | null;
  users: number | null;
  stores: number | null;
};

export type CurrentSubscriptionDto = {
  id: number;
  status: SubscriptionStatus;
  endDate: Date | null;
  plan: {
    code: PlanType;
    name: string;
  };
  limits: SubscriptionLimitsDto;
  features: FeatureCode[];
};

export type SecondaryShopEligibility = {
  ownerId: number;
  actorId: number;
  planCode: PlanType;
  maxStores: number;
  ownedShops: number;
  subscriptionStatus: SubscriptionStatus;
  endDate: Date | null;
};
