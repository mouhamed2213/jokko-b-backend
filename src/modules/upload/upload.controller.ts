import type { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { buildPublicBaseUrl } from "../../utils/url.js";
import { isValidImageFile } from "../../utils/file-signature.js";

const uploadDir = path.join(process.cwd(), "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`;
    callback(null, filename);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const extension = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(extension)) {
    callback(null, true);
    return;
  }
  callback(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
};

export const upload = multer({
  storage: localStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadProductImage = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu" });
  }

  if (!isValidImageFile(req.file.path)) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ message: "Le fichier envoyé n'est pas une image valide" });
  }

  const baseUrl = buildPublicBaseUrl(req);
  const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

  return res.status(200).json({
    message: "Image uploadée avec succès",
    imageUrl,
    filename: req.file.filename,
  });
};

export const deleteProductImage = (req: Request, res: Response) => {
  const { filename } = req.params;

  if (filename.includes("/") || filename.includes("..")) {
    return res.status(400).json({ message: "Nom de fichier invalide" });
  }

  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Fichier introuvable" });
  }

  fs.unlinkSync(filePath);
  return res.status(200).json({ message: "Image supprimée" });
};
