import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserRole,
} from "./user.dto.js";
import { PERMISSION_CODES, type PermissionCode } from "./permission.constants.js";

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${field} obligatoire`);
  }

  return value.trim();
};

const parseUserId = (value: unknown): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Identifiant utilisateur invalide");
  }

  return id;
};

const normalizeRole = (value: unknown): UserRole | undefined => {
  if (value === undefined) return undefined;
  if (value !== "ADMIN" && value !== "EMPLOYEE") {
    throw new BadRequestError("Rôle utilisateur invalide");
  }

  return value;
};

export const UserSchemas = {
  userId: parseUserId,

  create: (input: unknown): CreateUserDto => {
    const body = input as Partial<CreateUserDto>;

    return {
      name: requiredString(body.name, "Nom"),
      email: requiredString(body.email, "Email"),
      password: requiredString(body.password, "Mot de passe"),
      role: normalizeRole(body.role) ?? "EMPLOYEE",
    };
  },

  permissions: (input: unknown): Array<{ code: PermissionCode; allowed: boolean }> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new BadRequestError("Permissions invalides");
    }
    const permissions = (input as { permissions?: unknown }).permissions;
    if (!Array.isArray(permissions)) throw new BadRequestError("Permissions invalides");
    return permissions.map((permission) => {
      if (!permission || typeof permission !== "object") throw new BadRequestError("Permissions invalides");
      const code = (permission as { code?: unknown }).code;
      const allowed = (permission as { allowed?: unknown }).allowed;
      if (!PERMISSION_CODES.includes(code as PermissionCode) || typeof allowed !== "boolean") {
        throw new BadRequestError("Permissions invalides");
      }
      return { code: code as PermissionCode, allowed };
    });
  },

  update: (input: unknown): UpdateUserDto => {
    const body = input as Partial<UpdateUserDto>;
    const data: UpdateUserDto = {};

    if (body.name !== undefined) {
      data.name = requiredString(body.name, "Nom");
    }
    if (body.role !== undefined) {
      data.role = normalizeRole(body.role);
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        throw new BadRequestError("Statut utilisateur invalide");
      }
      data.isActive = body.isActive;
    }
    if (body.password !== undefined) {
      data.password = requiredString(body.password, "Mot de passe");
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Aucune modification fournie");
    }

    return data;
  },
};
