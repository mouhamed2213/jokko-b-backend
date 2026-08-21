import { BadRequestError } from "../../utils/errors.js";
import type { DashboardContextDto } from "./dashboard.dto.js";

export const DashboardSchemas = {
  context: (shopId: unknown, ownerId: unknown): DashboardContextDto => {
    const normalizedShopId = Number(shopId);
    const normalizedOwnerId = Number(ownerId);

    if (
      !Number.isInteger(normalizedShopId) ||
      normalizedShopId <= 0 ||
      !Number.isInteger(normalizedOwnerId) ||
      normalizedOwnerId <= 0
    ) {
      throw new BadRequestError("Contexte boutique invalide");
    }

    return { shopId: normalizedShopId, ownerId: normalizedOwnerId };
  },
};
