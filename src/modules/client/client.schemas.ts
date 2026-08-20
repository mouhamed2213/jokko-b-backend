import { BadRequestError } from "../../utils/errors.js";
import type { CreateClientDto, UpdateClientDto } from "./client.dto.js";

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
