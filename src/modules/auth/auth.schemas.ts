import { BadRequestError } from "../../utils/errors.js";
import type { LoginDto } from "./auth.dto.js";

export const AuthSchemas = {
  login: (input: unknown): LoginDto => {
    const body = input as Partial<LoginDto>;

    if (!body.email || !body.password) {
      throw new BadRequestError("Email et mot de passe obligatoires");
    }

    if (typeof body.email !== "string" || typeof body.password !== "string") {
      throw new BadRequestError("Email et mot de passe obligatoires");
    }

    return {
      email: body.email.trim(),
      password: body.password,
    };
  },
};
