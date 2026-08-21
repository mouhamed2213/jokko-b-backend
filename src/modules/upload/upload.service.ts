import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/errors.js";
import type { UploadTarget } from "./upload.dto.js";
import { UploadRepository } from "./upload.repository.js";
import { UploadSchemas } from "./upload.schemas.js";

export const UploadService = {
  uploadFile: async (
    file: Express.Multer.File,
    filePath: string,
    imageFor: UploadTarget,
  ) => {
    if (!file?.buffer) {
      throw new AppError("Aucun fichier reçu", 400);
    }

    const target = UploadSchemas.target(imageFor);
    const safePath = UploadSchemas.storagePath(filePath);

    try {
      return await UploadRepository.upload(target, safePath, file);
    } catch (error) {
      logger.error("Erreur upload Storage", { error, target });
      throw new AppError("Échec de l'upload du fichier");
    }
  },

  deleteFile: async (bucket: string, filePath: string) => {
    const safePath = UploadSchemas.storagePath(filePath);
    const allowedBuckets = [
      UploadRepository.bucketFor("logo"),
      UploadRepository.bucketFor("product"),
    ];

    if (!allowedBuckets.includes(bucket)) {
      throw new AppError("Bucket de stockage invalide", 400);
    }

    try {
      return await UploadRepository.remove(bucket, safePath);
    } catch (error) {
      logger.warn("Erreur suppression Storage", { error, bucket });
      throw new AppError("Impossible de supprimer le fichier");
    }
  },
};
