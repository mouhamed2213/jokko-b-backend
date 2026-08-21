import { BadRequestError } from "../../utils/errors.js";
import type {
  ShopListQueryDto,
  SubscriptionExtensionDto,
  UpdateShopStatusDto,
  UpdateUserStatusDto,
  UserListQueryDto,
} from "./super-admin.dto.js";

const positiveInteger = (value: unknown, fallback: number, label: string) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(`${label} invalide`);
  }
  return parsed;
};

const optionalReason = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const reason = String(value).trim();
  if (reason.length > 500) throw new BadRequestError("Raison trop longue");
  return reason || undefined;
};

const parseDate = (value: unknown): Date => {
  if (!value) throw new BadRequestError("Date de fin obligatoire");
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Date de fin invalide");
  }
  if (date <= new Date()) {
    throw new BadRequestError("La date de fin doit être dans le futur");
  }
  return date;
};

const parseBoolean = (value: unknown): boolean => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  throw new BadRequestError("Statut utilisateur invalide");
};

export const SuperAdminSchemas = {
  shopListQuery: (query: Record<string, unknown>): ShopListQueryDto => ({
    page: positiveInteger(query.page, 1, "Page"),
    limit: Math.min(positiveInteger(query.limit, 20, "Limite"), 100),
    ...(query.q ? { q: String(query.q).trim() } : {}),
    ...(query.status ? { status: String(query.status).trim() } : {}),
    ...(query.plan ? { plan: String(query.plan).trim() } : {}),
  }),

  userListQuery: (query: Record<string, unknown>): UserListQueryDto => ({
    page: positiveInteger(query.page, 1, "Page"),
    limit: Math.min(positiveInteger(query.limit, 20, "Limite"), 100),
    ...(query.q ? { q: String(query.q).trim() } : {}),
    ...(query.shopId ? { shopId: positiveInteger(query.shopId, 1, "Boutique") } : {}),
    ...(query.role ? { role: String(query.role).trim() } : {}),
    ...(query.isActive !== undefined
      ? { isActive: parseBoolean(query.isActive) }
      : {}),
  }),

  extension: (body: Record<string, unknown>): SubscriptionExtensionDto => ({
    endDate: parseDate(body.endDate),
    ...(optionalReason(body.reason) ? { reason: optionalReason(body.reason) } : {}),
  }),

  shopStatus: (body: Record<string, unknown>): UpdateShopStatusDto => {
    const status = String(body.status ?? "").trim();
    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      throw new BadRequestError("Statut boutique invalide");
    }
    return {
      status,
      ...(optionalReason(body.reason) ? { reason: optionalReason(body.reason) } : {}),
    };
  },

  userStatus: (body: Record<string, unknown>): UpdateUserStatusDto => ({
    isActive: parseBoolean(body.isActive),
    ...(optionalReason(body.reason) ? { reason: optionalReason(body.reason) } : {}),
  }),

  id: (value: unknown, label: string): number => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestError(`${label} invalide`);
    }
    return parsed;
  },
};
