import { BadRequestError } from "../../utils/errors.js";
import type { NotificationEventDto } from "./notification.dto.js";

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
};
