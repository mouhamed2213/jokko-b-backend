import { BadRequestError } from "../../utils/errors.js";
import type { NotificationEventDto, UpdateNotificationPreferencesDto } from "./notification.dto.js";

const booleanFields = new Set([
  "enabled",
  "lowStockEnabled",
  "outOfStockEnabled",
  "dormantProductEnabled",
  "clientDebtEnabled",
  "supplierDebtEnabled",
  "subscriptionExpiryEnabled",
  "marginEnabled",
  "cashDiscrepancyEnabled",
]);

const numberFields = new Set([
  "dormantDays",
  "subscriptionExpiryDays",
  "clientDebtThreshold",
  "supplierDebtThreshold",
  "marginRateThreshold",
  "marginPeriodDays",
]);

export const NotificationSchemas = {
  event: (event: unknown, data: unknown): { event: string; data: NotificationEventDto } => {
    const name = String(event ?? "").trim();
    if (!name || !/^[a-zA-Z0-9_.-]+$/.test(name)) {
      throw new BadRequestError("Événement de notification invalide");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BadRequestError("Données de notification invalides");
    }
    return { event: name, data: data as NotificationEventDto };
  },

  notificationId: (value: unknown) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError("Requête invalide");
    return id;
  },

  updatePreferences: (input: unknown): UpdateNotificationPreferencesDto => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestError("Préférences invalides");
    }

    const output: UpdateNotificationPreferencesDto = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!booleanFields.has(key) && !numberFields.has(key)) {
        throw new BadRequestError("Préférences invalides");
      }
      if (booleanFields.has(key)) {
        if (typeof value !== "boolean") throw new BadRequestError("Préférences invalides");
        (output as Record<string, unknown>)[key] = value;
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestError("Préférences invalides");
      }
      (output as Record<string, unknown>)[key] = value;
    }

    const positiveIntegerFields = [
      "dormantDays",
      "subscriptionExpiryDays",
      "marginPeriodDays",
    ];
    for (const field of positiveIntegerFields) {
      if (field in output) {
        const value = Number((output as Record<string, unknown>)[field]);
        if (!Number.isInteger(value) || value < 1 || value > 365) {
          throw new BadRequestError("Préférences invalides");
        }
      }
    }

    for (const field of ["clientDebtThreshold", "supplierDebtThreshold"]) {
      if (field in output && Number((output as Record<string, unknown>)[field]) < 0) {
        throw new BadRequestError("Préférences invalides");
      }
    }

    if ("marginRateThreshold" in output) {
      const value = Number((output as Record<string, unknown>).marginRateThreshold);
      if (value < -100 || value > 100) throw new BadRequestError("Préférences invalides");
    }

    return output;
  },
};
