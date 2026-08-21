import {
  LOGO_BUCKET,
  PRODUCT_BUCKET,
  supabase,
} from "../../config/storage.config.js";
import type { UploadResultDto, UploadTarget } from "./upload.dto.js";

const bucketByTarget: Record<UploadTarget, string> = {
  logo: LOGO_BUCKET,
  product: PRODUCT_BUCKET,
};

export const UploadRepository = {
  bucketFor: (target: UploadTarget) => bucketByTarget[target],

  upload: async (
    target: UploadTarget,
    filePath: string,
    file: Express.Multer.File,
  ): Promise<UploadResultDto> => {
    const { data, error } = await supabase.storage
      .from(bucketByTarget[target])
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;
    return { path: data.path };
  },

  remove: async (
    bucket: string,
    filePath: string,
  ) => {
    const { data, error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) throw error;
    return data;
  },
};
