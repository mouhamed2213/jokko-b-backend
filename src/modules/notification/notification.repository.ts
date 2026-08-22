import { prisma } from "../../config/prisma.js";
import type { UpdateNotificationPreferencesDto } from "./notification.dto.js";

const stockFields = {
  id: true,
  name: true,
  quantity: true,
  alertThreshold: true,
} as const;

const preferenceFields = {
  enabled: true,
  lowStockEnabled: true,
  outOfStockEnabled: true,
  dormantProductEnabled: true,
  clientDebtEnabled: true,
  supplierDebtEnabled: true,
  subscriptionExpiryEnabled: true,
  marginEnabled: true,
  cashDiscrepancyEnabled: true,
  dormantDays: true,
  subscriptionExpiryDays: true,
  clientDebtThreshold: true,
  supplierDebtThreshold: true,
  marginRateThreshold: true,
  marginPeriodDays: true,
} as const;

export const NotificationRepository = {
  findProductsForStream: async (shopId: number) =>
    prisma.product.findMany({
      where: { shopId, isActive: true },
      select: stockFields,
      orderBy: { name: "asc" },
    }),

  findProductsForStockAlerts: async (shopId: number) =>
    prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        ...stockFields,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),

  findOrCreatePreferences: async (shopId: number) =>
    prisma.notificationPreference.upsert({
      where: { shopId },
      create: { shopId },
      update: {},
      select: { ...preferenceFields },
    }),

  updatePreferences: async (shopId: number, data: UpdateNotificationPreferencesDto) =>
    prisma.notificationPreference.upsert({
      where: { shopId },
      create: { shopId, ...data },
      update: data,
      select: { ...preferenceFields },
    }),

  findNotifications: async (shopId: number) =>
    prisma.notification.findMany({
      where: { shopId, resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

  countUnread: async (shopId: number) =>
    prisma.notification.count({
      where: { shopId, resolvedAt: null, readAt: null },
    }),

  findNotificationByIdAndShop: async (id: number, shopId: number) =>
    prisma.notification.findFirst({ where: { id, shopId, resolvedAt: null } }),

  markRead: async (id: number, shopId: number) =>
    prisma.notification.updateMany({
      where: { id, shopId, resolvedAt: null },
      data: { readAt: new Date() },
    }),

  markAllRead: async (shopId: number) =>
    prisma.notification.updateMany({
      where: { shopId, resolvedAt: null, readAt: null },
      data: { readAt: new Date() },
    }),

  findActiveByKey: async (shopId: number, deduplicationKey: string) =>
    prisma.notification.findUnique({
      where: { shopId_deduplicationKey: { shopId, deduplicationKey } },
    }),

  createNotification: async (data: {
    shopId: number;
    type: string;
    severity: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: number | null;
    deduplicationKey: string;
    metadata?: any;
  }) => prisma.notification.create({ data }),

  reactivateNotification: async (id: number, data: {
    severity: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: number | null;
    metadata?: any;
  }) => prisma.notification.update({
    where: { id },
    data: { ...data, readAt: null, resolvedAt: null },
  }),

  resolveMissing: async (shopId: number, types: string[], activeKeys: string[]) =>
    prisma.notification.updateMany({
      where: {
        shopId,
        type: { in: types },
        resolvedAt: null,
        ...(activeKeys.length > 0 ? { deduplicationKey: { notIn: activeKeys } } : {}),
      },
      data: { resolvedAt: new Date() },
    }),

  resolveAll: async (shopId: number, types: string[]) =>
    prisma.notification.updateMany({
      where: { shopId, type: { in: types }, resolvedAt: null },
      data: { resolvedAt: new Date() },
    }),

  findShops: async () => prisma.shop.findMany({ select: { id: true } }),

  findCurrentPlan: async (shopId: number) => prisma.subscription.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: { status: true, endDate: true, plan: { select: { code: true } } },
  }),

  findEvaluationData: async (shopId: number, dormantSince: Date, marginSince: Date) => {
    const [products, clients, suppliers, subscription, reconciliation, sales] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, isActive: true },
        select: {
          id: true,
          name: true,
          quantity: true,
          alertThreshold: true,
          stockMovements: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          saleItems: {
            where: { sale: { createdAt: { gte: dormantSince } } },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.client.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          sales: {
            select: {
              remaining: true,
              returns: { select: { refundAmount: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          supplierDebts: { select: { remaining: true, status: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.subscription.findFirst({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        select: { endDate: true, status: true },
      }),
      prisma.cashReconciliation.findFirst({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, difference: true, createdAt: true },
      }),
      prisma.sale.findMany({
        where: { shopId, createdAt: { gte: marginSince } },
        select: { items: { select: { totalAmount: true, costTotal: true } } },
      }),
    ]);

    return { products, clients, suppliers, subscription, reconciliation, sales };
  },
};
