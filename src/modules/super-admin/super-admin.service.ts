import { logAuditAction } from "../../helpers/audit-logger.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { SubscriptionManagementService } from "./services/subscription-management.service.js";
import type {
  ShopListQueryDto,
  SubscriptionExtensionDto,
  UpdateShopStatusDto,
  UpdateUserStatusDto,
  UserListQueryDto,
} from "./super-admin.dto.js";
import { SuperAdminRepository } from "./super-admin.repository.js";

export type SuperAdminActor = {
  actorId: number;
  actorName: string;
};

const audit = async (
  actor: SuperAdminActor,
  action: string,
  targetType: string,
  targetId: number,
  details: Record<string, unknown>,
) => logAuditAction({ ...actor, action, targetType, targetId, details });

const mapShopListItem = (shop: any) => {
  const subscription = shop.subscriptions[0] ?? null;
  return {
    id: shop.id,
    name: shop.name,
    ownerName: shop.ownerName,
    email: shop.email,
    phone: shop.phone,
    status: shop.status,
    createdAt: shop.createdAt,
    subscription: subscription
      ? {
          status: subscription.status,
          endDate: subscription.endDate,
          plan: {
            code: subscription.plan.code,
            name: subscription.plan.name,
            price: subscription.plan.price,
          },
        }
      : null,
    counts: {
      users: shop._count.users,
      products: shop._count.products,
      sales: shop._count.sales,
    },
  };
};

export const SuperAdminService = {
  listShops: async (query: ShopListQueryDto) => {
    const { shops, total } = await SuperAdminRepository.listShops(query);
    return {
      data: shops.map(mapShopListItem),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getShopDetail: async (shopId: number) => {
    const result = await SuperAdminRepository.getShopDetail(shopId);
    if (!result) throw new NotFoundError("Boutique introuvable");

    const { shop, groupShops, salesRevenue, payments, auditLogs } = result;
    const subscription = shop.subscriptions[0] ?? null;

    return {
      id: shop.id,
      name: shop.name,
      ownerName: shop.ownerName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      logoUrl: shop.logoUrl,
      status: shop.status,
      currentShop: shop.currentShop,
      primaryShop: shop.primaryShop,
      secondaryShops: shop.secondaryShops,
      groupShops,
      owners: shop.owners,
      createdAt: shop.createdAt,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            plan: {
              code: subscription.plan.code,
              name: subscription.plan.name,
              price: subscription.plan.price,
              limits: {
                sales: subscription.plan.maxSalesPerMonth,
                products: subscription.plan.maxProducts,
                customers: subscription.plan.maxCustomers,
                users: subscription.plan.maxUsers,
                stores: subscription.plan.maxStores,
              },
            },
          }
        : null,
      users: shop.users,
      counts: {
        users: shop._count.users,
        products: shop._count.products,
        clients: shop._count.clients,
        suppliers: shop._count.suppliers,
        sales: shop._count.sales,
        salesRevenue: salesRevenue._sum.totalAmount ?? 0,
      },
      payments,
      auditLogs,
    };
  },

  getPlatformStats: async () => {
    const now = new Date();
    const expiryLimit = new Date(now);
    expiryLimit.setDate(expiryLimit.getDate() + 30);
    return SuperAdminRepository.platformStats(now, expiryLimit);
  },

  listUsers: async (query: UserListQueryDto) => {
    const { users, total } = await SuperAdminRepository.listUsers(query);
    return {
      data: users,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getUserDetail: async (userId: number) => {
    const user = await SuperAdminRepository.getUserDetail(userId);
    if (!user) throw new NotFoundError("Utilisateur introuvable");
    return user;
  },

  updateShopStatus: async (
    shopId: number,
    data: UpdateShopStatusDto,
    actor: SuperAdminActor,
  ) => {
    const current = await SuperAdminRepository.findShopForStatus(shopId);
    if (!current) throw new NotFoundError("Boutique introuvable");

    const shop = await SuperAdminRepository.updateShopStatus(shopId, data);
    await audit(actor, "UPDATE_SHOP_STATUS", "Shop", shopId, {
      before: { status: current.status },
      after: { status: shop.status },
      reason: data.reason,
    });
    return shop;
  },

  updateUserStatus: async (
    userId: number,
    data: UpdateUserStatusDto,
    actor: SuperAdminActor,
  ) => {
    const current = await SuperAdminRepository.findUserForStatus(userId);
    if (!current) throw new NotFoundError("Utilisateur introuvable");

    if (
      current.role === "ADMIN" &&
      current.isActive &&
      !data.isActive &&
      (await SuperAdminRepository.countOtherActiveAdmins(current.shopId, userId)) === 0
    ) {
      throw new ForbiddenError("Impossible de désactiver le dernier administrateur actif");
    }

    const user = await SuperAdminRepository.updateUserStatus(userId, data);
    await audit(actor, "UPDATE_USER_STATUS", "User", userId, {
      shopId: current.shopId,
      before: { isActive: current.isActive },
      after: { isActive: user.isActive },
      reason: data.reason,
    });
    return user;
  },

  extendSubscription: async (
    shopId: number,
    data: SubscriptionExtensionDto,
    actor: SuperAdminActor,
  ) => {
    const current = await SuperAdminRepository.findCurrentSubscription(shopId);
    if (!current) throw new NotFoundError("Abonnement introuvable");
    if (!current.endDate) {
      throw new ForbiddenError("Cet abonnement ne possède pas de date de fin");
    }

    const nextStatus =
      current.status === "SUSPENDED"
        ? "SUSPENDED"
        : current.status === "TRIAL" || current.status === "TRIAL_EXPIRED"
          ? "TRIAL"
          : "ACTIVE";
    const subscription = await SuperAdminRepository.extendSubscription(
      current.id,
      data.endDate,
      nextStatus,
    );

    await audit(actor, "EXTEND_SUBSCRIPTION", "Subscription", current.id, {
      shopId,
      before: { endDate: current.endDate, status: current.status },
      after: { endDate: subscription.endDate, status: subscription.status },
      reason: data.reason,
      payment: null,
    });

    return {
      subscription,
      payment: null,
      extension: {
        free: true,
        previousEndDate: current.endDate,
        newEndDate: subscription.endDate,
        reason: data.reason,
      },
    };
  },

  changePlan: async (shopId: number, planCode: string, actor: SuperAdminActor) => {
    const result = await SubscriptionManagementService.changePlan(shopId, planCode);
    await audit(actor, "UPDATE_SUBSCRIPTION_PLAN", "Shop", shopId, {
      planCode,
      paymentId: result.payment?.id ?? null,
    });
    return result;
  },

  updateSubscriptionStatus: async (
    shopId: number,
    status: any,
    actor: SuperAdminActor,
  ) => {
    const result = await SubscriptionManagementService.updateStatus(shopId, status);
    await audit(actor, "UPDATE_SUBSCRIPTION_STATUS", "Shop", shopId, { status });
    return result;
  },
};
