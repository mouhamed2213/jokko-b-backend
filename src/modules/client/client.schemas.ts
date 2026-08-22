import { BadRequestError } from "../../utils/errors.js";
import type {
  ClientStatementQueryDto,
  CreateClientDto,
  CreateClientReminderDto,
  UpdateClientDto,
} from "./client.dto.js";

const requiredText = (value: unknown, field: string): string => {
  const text = String(value ?? "").trim();
  if (!text) throw new BadRequestError("Données client invalides");
  return text;
};

const optionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

export const ClientSchemas = {
  id: (value: unknown): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError("Identifiant client invalide");
    }
    return id;
  },

  create: (input: Record<string, unknown>): CreateClientDto => {
    const email = optionalText(input.email);
    const address = optionalText(input.address);

    return {
      name: requiredText(input.name, "Nom"),
      phone: requiredText(input.phone, "Téléphone"),
      ...(email ? { email } : {}),
      ...(address ? { address } : {}),
    };
  },

  statementQuery: (input: Record<string, unknown>): ClientStatementQueryDto => {
    const from = input.from ? new Date(String(input.from)) : undefined;
    const to = input.to ? new Date(String(input.to)) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw new BadRequestError("Période invalide");
    }
    if (from && to && from > to) throw new BadRequestError("Période invalide");
    return { from, to };
  },

  reminder: (input: Record<string, unknown>): CreateClientReminderDto => {
    const message = optionalText(input.message);
    if (message && message.length > 500) throw new BadRequestError("Rappel invalide");
    return { ...(message ? { message } : {}) };
  },

  update: (input: Record<string, unknown>): UpdateClientDto => {
    const data: UpdateClientDto = {};

    if (input.name !== undefined) data.name = requiredText(input.name, "Nom");
    if (input.phone !== undefined) {
      data.phone = requiredText(input.phone, "Téléphone");
    }
    if (input.email !== undefined) data.email = optionalText(input.email) ?? null;
    if (input.address !== undefined) {
      data.address = optionalText(input.address) ?? null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Aucune modification fournie");
    }

    return data;
  },
};
