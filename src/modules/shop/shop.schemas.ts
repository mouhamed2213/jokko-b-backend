import type { SwitchShopDto } from "./shop.dto.js";

export const ShopSchemas = {
  switchShop: (input: unknown): SwitchShopDto => {
    const body = input as Partial<SwitchShopDto>;

    if (!body.password || typeof body.password !== "string") {
      throw new Error("Mot de passe obligatoire");
    }

    const targetShopId = Number(body.targetShopId);
    const userId = Number(body.userId);

    if (!Number.isInteger(targetShopId) || targetShopId <= 0) {
      throw new Error("Boutique cible invalide");
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Utilisateur invalide");
    }

    return {
      userId,
      password: body.password,
      targetShopId,
    };
  },
};
