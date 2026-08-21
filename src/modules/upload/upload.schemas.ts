import { BadRequestError } from "../../utils/errors.js";
import type { UploadTarget } from "./upload.dto.js";

export const UploadSchemas = {
  target: (value: unknown): UploadTarget => {
    if (value === "logo" || value === "product") return value;
    throw new BadRequestError("Cible de stockage invalide");
  },

  storagePath: (value: unknown): string => {
    const path = String(value ?? "").trim();
    if (!path || path.startsWith("/") || path.includes("..")) {
      throw new BadRequestError("Chemin de fichier invalide");
    }
    return path;
  },
};
