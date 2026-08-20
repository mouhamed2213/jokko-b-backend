import { BadRequestError } from "../../utils/errors.js";
import type { LoginDto } from "./auth.dto.js";

export const AuthSchemas = {
  login: (input: unknown): LoginDto => {
    const body = input as Partial<LoginDto>;

    if (!body.email || typeof body.email !== "string") {
      throw new BadRequestError("Email obligatoire");
    }

    if (!body.password || typeof body.password !== "string") {
      throw new BadRequestError("Mot de passe obligatoire");
    }

    return {
      email: body.email.trim(),
      password: body.password,
    };
  },
};
