import bcrypt from "bcrypt";
import { Request, Response } from "express";

import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { AuthController } from "../modules/auth/auth.controller.js";
import { env } from "../config/env-config.js";

// ── Login utilisateur boutique ────────────────────────────────
export const login = AuthController.login;

// ── Login Super Admin ─────────────────────────────────────────
export const loginSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe obligatoires" });
    }

    const admin = await prisma.superAdmin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: "SUPER_ADMIN" },
      env.secret.jwt,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Connexion Super Admin réussie",
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "SUPER_ADMIN",
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la connexion", error });
  }
};

// ── Mot de passe oublié ───────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  // TODO: implémenter l'envoi d'email avec nodemailer
  return res.status(200).json({
    message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
  });
};

export const me = AuthController.me;
