import { prisma } from "../../config/prisma.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export const UserRepository = {
  findOwnership: async (ownerUserId: number, shopId: number) => {
    return prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerUserId, shopId } },
      select: { id: true, userId: true, shopId: true },
    });
  },

  findUsersByShop: async (shopId: number) => {
    return prisma.user.findMany({
      where: { shopId },
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  countByShop: async (shopId: number) => {
    return prisma.user.count({ where: { shopId } });
  },

  findByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } });
  },

  findByIdAndShop: async (id: number, shopId: number) => {
    return prisma.user.findFirst({
      where: { id, shopId },
      select: { id: true, shopId: true },
    });
  },

  create: async (data: {
    shopId: number;
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "EMPLOYEE";
  }) => {
    return prisma.user.create({
      data,
      select: userSelect,
    });
  },

  update: async (
    id: number,
    data: {
      name?: string;
      role?: "ADMIN" | "EMPLOYEE";
      isActive?: boolean;
      password?: string;
    },
  ) => {
    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  },

  delete: async (id: number) => {
    return prisma.user.delete({ where: { id } });
  },
};
