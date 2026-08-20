import type {
  CurrentShopType,
  PlanType,
} from "../../database/prisma/generated/prisma/enums.js";

export type SwitchShopDto = {
  userId: number;
  password: string;
  targetShopId: number;
};

export type SwitchShopUserDto = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  shopId: number;
  shopName: string;
};

export type SwitchShopResult = {
  token: string;
  user: SwitchShopUserDto;
};

export type CreateShopDto = {
  shopName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: string | null;
  adminPassword: string;
  currentShop?: CurrentShopType;
  planType: PlanType;
  onwnerId?: number;
};

export type CreateSecondaryShopDto = {
  shopName: string;
  ownerName: string;
  address?: string | null;
  phone: string;
  email: string;
  password: string;
};

export type UpdateShopSettingsDto = {
  name: string;
  ownerName: string;
  phone: string;
  address?: string | null;
};

export type ShopSummaryDto = {
  id: number;
  shopOwner: number;
  actorName: string;
  name: string;
  plan: PlanType;
  address: string | null;
  logoUrl: string | null;
  currentShop: CurrentShopType;
};
