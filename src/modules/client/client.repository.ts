import { prisma } from "../../config/prisma.js";
import type { CreateClientDto, UpdateClientDto } from "./client.dto.js";

const salesSummaryInclude = {
  sales: {
    select: { totalAmount: true, paidAmount: true, remaining: true },
  },
} as const;

export const ClientRepository = {
  findOwnership: async (ownerUserId: number, shopId: number) => {
    return prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerUserId, shopId } },
      select: { id: true, userId: true, shopId: true },
    });
  },

  findManyByShop: async (shopId: number) => {
    return prisma.client.findMany({
      where: { shopId },
      include: salesSummaryInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findByIdAndShop: async (id: number, shopId: number) => {
    return prisma.client.findFirst({
      where: { id, shopId },
      include: {
        sales: {
          include: { items: { include: { product: true } }, payments: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  findExistingByContact: async (
    shopId: number,
    phone: string,
    email?: string,
    excludedId?: number,
  ) => {
    return prisma.client.findFirst({
      where: {
        shopId,
        ...(excludedId ? { NOT: { id: excludedId } } : {}),
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });
  },

  countByShop: async (shopId: number) => {
    return prisma.client.count({ where: { shopId } });
  },

  findImportConflicts: async (shopId: number, phones: string[], emails: string[]) =>
    prisma.client.findMany({
      where: {
        shopId,
        OR: [
          ...(phones.length ? [{ phone: { in: phones } }] : []),
          ...(emails.length ? [{ email: { in: emails } }] : []),
        ],
      },
      select: { id: true, phone: true, email: true },
    }),

  create: async (shopId: number, data: CreateClientDto) => {
    return prisma.client.create({
      data: {
        shopId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
      },
    });
  },

  update: async (id: number, data: UpdateClientDto) => {
    return prisma.client.update({
      where: { id },
      data,
    });
  },

  findWithSalesCount: async (id: number, shopId: number) => {
    return prisma.client.findFirst({
      where: { id, shopId },
      include: { _count: { select: { sales: true } } },
    });
  },

  delete: async (id: number) => {
    return prisma.client.delete({ where: { id } });
  },

  findStatementByIdAndShop: async (
    clientId: number,
    shopId: number,
    query: { from?: Date; to?: Date } = {},
  ) => {
    const createdAt = query.from || query.to
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        }
      : undefined;

    return prisma.client.findFirst({
      where: { id: clientId, shopId },
      include: {
        sales: {
          ...(createdAt ? { where: { createdAt } } : {}),
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                unitPrice: true,
                totalAmount: true,
              },
            },
            payments: {
              orderBy: { paidAt: "asc" },
              select: { id: true, amount: true, note: true, paymentMethod: true, paidAt: true },
            },
            returns: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                refundAmount: true,
                reason: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        reminders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
  },

  createReminder: async (
    clientId: number,
    shopId: number,
    userId: number,
    amountDue: number,
    message: string,
  ) =>
    prisma.clientReminder.create({
      data: { clientId, shopId, userId, amountDue, message, channel: "IN_APP" },
      include: { user: { select: { id: true, name: true } } },
    }),
};
