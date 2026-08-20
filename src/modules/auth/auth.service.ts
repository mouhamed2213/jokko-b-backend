import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env-config.js";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import type { LoginDto, LoginResult } from "./auth.dto.js";
import { AuthRepository } from "./auth.repository.js";

export const AuthService = {
  login: async (credentials: LoginDto): Promise<LoginResult> => {
    const user = await AuthRepository.findUserForLogin(credentials.email);

    if (!user) {
      throw new UnauthorizedError("Identifiants invalides");
    }

    const shopOwner = await AuthRepository.findShopOwner(user.shopId);

    if (!shopOwner) {
      throw new NotFoundError("Propriétaire non retrouvé");
    }

    if (!user.isActive) {
      throw new ForbiddenError(
        "Compte désactivé. Contactez votre administrateur.",
      );
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!isPasswordValid) {
      logger.warn(
        `❌ Tentative de connexion échouée — ${credentials.email} (mauvais mot de passe)`,
      );
      throw new UnauthorizedError("Identifiants invalides");
    }

    const plan = user.shop.subscriptions[0]?.plan.code;

    if (!plan) {
      throw new NotFoundError("Plan non retrouvé");
    }

    const token = jwt.sign(
      {
        ownerId: shopOwner.userId,
        userId: user.id,
        shopId: user.shopId,
        plan: plan === "FREE",
        role: user.role,
      },
      env.secret.jwt,
      { expiresIn: "3d" },
    );

    logger.info(
      `✅ Connexion réussie — ${user.email} (${user.role}) — Boutique: ${user.shop.name}`,
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan,
        shopId: user.shopId,
        shopName: user.shop.name,
      },
    };
  },

  getMe: async (userId: number, shopId: number) => {
    const user = await AuthRepository.findUserByShop(userId, shopId);

    if (!user) {
      throw new NotFoundError("not found");
    }

    return AuthRepository.findShopWithSubscription(shopId);
  },
};
