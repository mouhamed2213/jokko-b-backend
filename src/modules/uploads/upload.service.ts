import { logger } from "../../config/logger";
import {
  LOGO_BUCKET,
  PRODUCT_BUCKET,
  supabase,
} from "../../config/storage.config";
import { AppError } from "../../utils/errors";


export const UploadService = {
  uploadFile: async (
    file: Express.Multer.File,
    filePath: string,
    imageFor: string,
  ) => {
    let bucket: string = "";
    
    if(imageFor === "logo"){
      bucket  = LOGO_BUCKET
    }
    
    else if(imageFor === "product"){
      bucket  = PRODUCT_BUCKET
    }


    console.log(bucket)

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (error) {
      throw new AppError(`Échec de l'opload du fichier ${error.message}`);
    }
    return data;
  },

  //   Delete file
  deleteFile: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      logger.warn("Supabase Storage Delete Error:", error.message);
      throw new AppError(`Impossible de supprimer l'image `);
    }

    return data;
  },
};
