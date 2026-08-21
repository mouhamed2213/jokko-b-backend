import { prisma } from "../../config/prisma.js";
import type {
  ShopListQueryDto,
  UpdateShopStatusDto,
  UpdateUserStatusDto,
  UserListQueryDto,
} from "./super-admin.dto.js";

type ShopWhere = Record<string, any>;
type UserWhere = Record<string, any>;

const shopWhere = (query: ShopListQueryDto): ShopWhere => ({
  ...(query.status ? { status: query.status } : {}),
  ...(query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
          { ownerName: { contains: query.q, mode: "insensitive" } },
        ],
      }
    : {}),
  ...(query.plan
    ? {
        subscriptions: {
          some: { plan: { code: query.plan } },
        },
      }
    : {}),
});

const userWhere = (query: UserListQueryDto): UserWhere => ({
  ...(query.shopId ? { shopId: query.shopId } : {}),
  ...(query.role ? { role: query.role } : {}),
  ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
  ...(query.q
    ? {
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
        ],
      }
    : {}),
});

export const SuperAdminRepository = {
  listShops: async (query: ShopListQueryDto) => {
    const where = shopWhere(query);
    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true },
          },
          _count: { select: { users: true, products: true, sales: true } },
        },
      }),
      prisma.shop.count({ where }),
    ]);
    return { shops, total };
  },

  getShopDetail: async (shopId: number) => {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        primaryShop: { select: { id: true, name: true, status: true } },
        secondaryShops: { select: { id: true, name: true, status: true } },
        owners: {
          select: {
            id: true,
            userId: true,
            phone: true,
            user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: { users: true, products: true, clients: true, suppliers: true, sales: true },
        },
      },
    });

    if (!shop) return null;
    const rootShopId = shop.primaryShopId ?? shop.id;

    const [groupShops, salesRevenue, payments, auditLogs] = await Promise.all([
      prisma.shop.findMany({
        where: { OR: [{ id: rootShopId }, { primaryShopId: rootShopId }] },
        select: {
          id: true,
          name: true,
          status: true,
          primaryShopId: true,
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true, endDate: true, plan: { select: { code: true, name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.sale.aggregate({ where: { shopId }, _sum: { totalAmount: true } }),
      prisma.payment.findMany({
        where: { shopOwner: { shopId } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          amount: true,
          currency: true,
          provider: true,
          status: true,
          paymentType: true,
          transactionReference: true,
          providerReference: true,
          paidAt: true,
          createdAt: true,
          subscription: { select: { id: true, status: true, startDate: true, endDate: true, plan: { select: { code: true, name: true } } } },
        },
      }),
      prisma.auditLog.findMany({
        where: { targetType: { in: ["Shop", "Subscription", "User"] }, targetId: shopId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return { shop, groupShops, salesRevenue, payments, auditLogs };
  },

  listUsers: async (query: UserListQueryDto) => {
    const where = userWhere(query);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          shopId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          shop: { select: { id: true, name: true, ownerName: true, status: true } },
          ownedShops: {
            select: { shop: { select: { id: true, name: true, status: true, primaryShopId: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total };
  },

  getUserDetail: async (userId: number) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        shopId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        shop: { select: { id: true, name: true, ownerName: true, status: true } },
        ownedShops: {
          select: { id: true, phone: true, shop: { select: { id: true, name: true, status: true, primaryShopId: true } } },
        },
        _count: { select: { sales: true, cashRegisters: true, stockMovements: true } },
      },
    }),

  updateShopStatus: (shopId: number, data: UpdateShopStatusDto) =>
    prisma.shop.update({ where: { id: shopId }, data: { status: data.status } }),

  updateUserStatus: (userId: number, data: UpdateUserStatusDto) =>
    prisma.user.update({ where: { id: userId }, data: { isActive: data.isActive } }),

  findShopForStatus: (shopId: number) =>
    prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true, status: true } }),

  findUserForStatus: (userId: number) =>
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, shopId: true, name: true, email: true, role: true, isActive: true } }),

  countOtherActiveAdmins: (shopId: number, userId: number) =>
    prisma.user.count({ where: { shopId, role: "ADMIN", isActive: true, id: { not: userId } } }),

  findCurrentSubscription: (shopId: number) =>
    prisma.subscription.findFirst({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      include: { plan: true, shop: { select: { id: true, name: true } } },
    }),

  extendSubscription: (subscriptionId: number, endDate: Date, status: string) =>
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endDate, status: status as any },
      include: { plan: true, shop: { select: { id: true, name: true } } },
    }),

  platformStats: async (now: Date, expiryLimit: Date) => {
    const [
      totalShops,
      totalUsers,
      activeUsers,
      totalProducts,
      totalClients,
      totalSales,
      salesRevenue,
      paymentSummary,
      pendingPayments,
      failedPayments,
      expiringSoon,
      expiredSubscriptions,
      suspendedSubscriptions,
      shopsByStatusGroup,
      subscriptionsByStatusGroup,
      subscriptionsByPlanGroup,
      plans,
      activeSubscriptions,
      recentShops,
      recentSubscriptions,
      recentPayments,
      recentActivity,
    ] = await Promise.all([
      prisma.shop.count(),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.client.count(),
      prisma.sale.count(),
      prisma.sale.aggregate({ _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ _count: { _all: true }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "FAILED" } }),
      prisma.subscription.count({
        where: { endDate: { gt: now, lte: expiryLimit }, status: { in: ["ACTIVE", "TRIAL"] } },
      }),
      prisma.subscription.count({ where: { status: { in: ["EXPIRED", "TRIAL_EXPIRED"] } } }),
      prisma.subscription.count({ where: { status: "SUSPENDED" } }),
      prisma.shop.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.subscription.groupBy({ by: ["planId"], _count: { _all: true } }),
      prisma.plan.findMany({ select: { id: true, code: true } }),
      prisma.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: { select: { code: true, price: true } } } }),
      prisma.shop.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, email: true, status: true, createdAt: true } }),
      prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { plan: { select: { code: true, name: true, price: true } }, shop: { select: { id: true, name: true, email: true } } } }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, amount: true, currency: true, provider: true, status: true, paymentType: true, createdAt: true, paidAt: true, subscription: { select: { shop: { select: { id: true, name: true } }, plan: { select: { code: true, name: true } } } } } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, actorId: true, actorName: true, action: true, targetType: true, targetId: true, details: true, createdAt: true } }),
    ]);

    const shopsByStatus: Record<string, number> = {};
    shopsByStatusGroup.forEach((entry: any) => { shopsByStatus[entry.status] = entry._count._all; });
    const subscriptionsByStatus: Record<string, number> = {};
    subscriptionsByStatusGroup.forEach((entry: any) => { subscriptionsByStatus[entry.status] = entry._count._all; });
    const planById = new Map(plans.map((plan) => [plan.id, plan.code]));
    const subscriptionsByPlan: Record<string, number> = {};
    subscriptionsByPlanGroup.forEach((entry: any) => {
      const code = planById.get(entry.planId) ?? String(entry.planId);
      subscriptionsByPlan[code] = entry._count._all;
    });
    const mrr = activeSubscriptions.reduce((total, subscription) =>
      subscription.plan.code === "FREE" ? total : total + (subscription.plan.price || 0), 0);

    return {
      totalShops,
      totalUsers,
      activeUsers,
      totalProducts,
      totalClients,
      totalSales,
      totalRevenue: salesRevenue._sum.totalAmount ?? 0,
      totalSubscriptionPayments: paymentSummary._count._all,
      subscriptionPaymentAmount: paymentSummary._sum.amount ?? 0,
      pendingPayments,
      failedPayments,
      subscriptionsExpiringSoon: expiringSoon,
      expiredSubscriptions,
      suspendedSubscriptions,
      shopsByStatus,
      subscriptionsByStatus,
      subscriptionsByPlan,
      mrr,
      monthlyRecurringRevenue: mrr,
      recentShops,
      recentSubscriptions,
      recentPayments,
      recentActivity,
    };
  },
};
