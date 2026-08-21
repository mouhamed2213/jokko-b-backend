import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env-config.js";
import { LOGO_BUCKET } from "../../config/storage.config.js";
import { SubscriptionService } from "../subscription/subscription.service.js";
import { UploadService } from "../upload/upload.service.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import {
  cleanPath,
  getFullStorageUrl,
  validateFile,
} from "../../utils/file-upload.js";
import type {
  CreateSecondaryShopDto,
  CreateShopDto,
  ShopSummaryDto,
  SwitchShopDto,
  SwitchShopResult,
  UpdateShopSettingsDto,
} from "./shop.dto.js";
import { ShopRepository } from "./shop.repository.js";

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

  createShop: async (data: CreateShopDto) => {
    const endDate =
      data.planType === "FREE"
        ? null
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const subscriptionStatus = data.planType === "FREE" ? "ACTIVE" : "TRIAL";
    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    const shop = await ShopRepository.createPrimaryShop({
      shopName: data.shopName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone ?? "",
      address: data.address ?? null,
      hashedPassword,
      planType: data.planType,
      endDate,
      subscriptionStatus,
    });

    if (!shop) {
      throw new NotFoundError("Plan not found");
    }

    return shop;
  },

  createSecondaryShop: async (
    ownerId: number,
    actorId: number,
    data: CreateSecondaryShopDto,
  ) => {
    const eligibility =
      await SubscriptionService.assertCanCreateSecondaryShop(ownerId, actorId);

    const owner = await ShopRepository.findUserByIdWithShop(ownerId);

    if (!owner) {
      throw new NotFoundError("User not found");
    }

    const existingUser = await ShopRepository.findUserByEmail(data.email);

    if (existingUser) {
      throw new ConflictError("Cette address mail exist déja");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const shop = await ShopRepository.createSecondaryShop({
      shopName: data.shopName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      primaryShopId: owner.shop.id,
      ownerId,
      planCode: eligibility.planCode,
      endDate: eligibility.endDate,
    });

    if (!shop) {
      throw new NotFoundError(`Plan not found: ${eligibility.planCode}`);
    }

    return shop;
  },

  find: async (email: string) => ShopRepository.findByEmail(email),

  getShops: async (ownerId: number): Promise<ShopSummaryDto[]> => {
    const ownership = await ShopRepository.findOwnedShops(ownerId);

    if (ownership.length === 0) {
      throw new ForbiddenError("Access interdit");
    }

    return ownership.map((item) => ({
      id: item.shop.id,
      shopOwner: ownerId,
      actorName: item.shop.ownerName,
      name: item.shop.name,
      plan: item.shop.subscriptions[0]?.plan.code ?? "FREE",
      address: item.shop.address,
      logoUrl: getFullStorageUrl(LOGO_BUCKET, item.shop.logoUrl),
      currentShop: item.shop.currentShop,
    }));
  },

  getSettings: async (shopId: number) => {
    const shopData = await ShopRepository.findSettings(shopId);

    if (!shopData) {
      throw new NotFoundError("Boutique introuvable");
    }

    return {
      ...shopData,
      logoUrl: getFullStorageUrl(LOGO_BUCKET, shopData.logoUrl),
    };
  },

  updateSettings: async (
    shopId: number,
    ownerId: number,
    data: UpdateShopSettingsDto,
  ) => {
    return ShopRepository.updateSettings(shopId, ownerId, {
      name: data.name.trim(),
      ownerName: data.ownerName.trim(),
      phone: data.phone.trim(),
      address: data.address?.trim() || null,
    });
  },

  uploadLogo: async (shopId: number, file: Express.Multer.File) => {
    validateFile(file);
    const generatePath = cleanPath(file);
    const logoPath = await UploadService.uploadFile(file, generatePath, "logo");
    const shop = await ShopRepository.updateLogo(shopId, logoPath.path);

    return { generatePath, shop };
  },

  deleteLogo: async (shopId: number) => {
    const shop = await ShopRepository.findLogo(shopId);

    if (!shop) {
      throw new NotFoundError("Boutique introuvable");
    }

    const data = await UploadService.deleteFile(LOGO_BUCKET, shop.logoUrl ?? "");

    if (!data || data.length === 0) {
      // L’absence du fichier distant ne doit pas empêcher la suppression de la référence DB.
    }

    await ShopRepository.deleteLogo(shopId);
  },
};
