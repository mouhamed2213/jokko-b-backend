import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateSecondaryShopDto,
  CreateShopDto,
  SwitchShopDto,
  UpdateShopSettingsDto,
} from "./shop.dto.js";

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${field} obligatoire`);
  }

  return value.trim();
};

export const ShopSchemas = {
  switchShop: (input: unknown): SwitchShopDto => {
    const body = input as Partial<SwitchShopDto>;

    if (!body.password || typeof body.password !== "string") {
      throw new BadRequestError("Mot de passe obligatoire");
    }

    const targetShopId = Number(body.targetShopId);
    const userId = Number(body.userId);

    if (!Number.isInteger(targetShopId) || targetShopId <= 0) {
      throw new BadRequestError("Boutique cible invalide");
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestError("Utilisateur invalide");
    }

    return {
      userId,
      password: body.password,
      targetShopId,
    };
  },

  createShop: (input: unknown): CreateShopDto => {
    const body = input as Partial<CreateShopDto>;

    if (!body.planType) {
      throw new BadRequestError("Plan obligatoire");
    }

    return {
      shopName: requiredString(body.shopName, "Nom boutique"),
      ownerName: requiredString(body.ownerName, "Nom propriétaire"),
      email: requiredString(body.email, "Email"),
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      address: typeof body.address === "string" ? body.address.trim() : null,
      adminPassword: requiredString(body.adminPassword, "Mot de passe"),
      currentShop: body.currentShop,
      planType: body.planType,
      onwnerId: body.onwnerId,
    };
  },

  createSecondaryShop: (input: unknown): CreateSecondaryShopDto => {
    const body = input as Partial<CreateSecondaryShopDto>;

    return {
      shopName: requiredString(body.shopName, "Nom boutique"),
      ownerName: requiredString(body.ownerName, "Nom propriétaire"),
      address: typeof body.address === "string" ? body.address.trim() : null,
      phone: requiredString(body.phone, "Téléphone"),
      email: requiredString(body.email, "Email"),
      password: requiredString(body.password, "Mot de passe"),
    };
  },

  updateSettings: (input: unknown): UpdateShopSettingsDto => {
    const body = input as Partial<UpdateShopSettingsDto>;

    return {
      name: requiredString(body.name, "Nom boutique"),
      ownerName: requiredString(body.ownerName, "Nom propriétaire"),
      phone: requiredString(body.phone, "Téléphone"),
      address: typeof body.address === "string" ? body.address.trim() : null,
    };
  },
};
