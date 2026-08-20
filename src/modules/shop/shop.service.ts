import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env-config.js";
import {
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { ShopRepository } from "./shop.repository.js";
import type { SwitchShopDto, SwitchShopResult } from "./shop.dto.js";

export const ShopService = {
  switchShop: async (
    ownerId: number,
    shopData: SwitchShopDto,
  ): Promise<SwitchShopResult> => {
    const ownership = await ShopRepository.findOwnership(
      ownerId,
      shopData.targetShopId,
    );

    if (!ownership) {
      throw new UnauthorizedError("Accée non autorisé");
    }

    const actor = await ShopRepository.findTargetUser(shopData.targetShopId);

    if (!actor) {
      throw new NotFoundError("Utillsateur non reconnu");
    }

    const isPasswordValid = await bcrypt.compare(
      shopData.password,
      actor.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Mot de passe incorrect");
    }

    const plan = actor.shop.subscriptions[0]?.plan.code;

    if (!plan) {
      throw new NotFoundError("Plan non retrouvé");
    }

    const token = jwt.sign(
      {
        ownerId: ownership.userId,
        userId: actor.id,
        shopId: actor.shopId,
        plan: plan === "FREE",
        role: actor.role,
      },
      env.secret.jwt,
      { expiresIn: "1d" },
    );

    return {
      token,
      user: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
        plan,
        shopId: actor.shopId,
        shopName: actor.shop.name,
      },
    };
  },
};
