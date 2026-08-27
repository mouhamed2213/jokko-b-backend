import { ForbiddenError } from "../../utils/errors.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import { NotificationRepository } from "./notification.repository.js";
import { NotificationSchemas } from "./notification.schemas.js";
import type {
  NotificationDto,
  NotificationEventDto,
  NotificationEvaluationDto,
  NotificationSeverity,
  NotificationType,
  StockAlertProductDto,
  StockAlertsDto,
  UpdateNotificationPreferencesDto,
} from "./notification.dto.js";

type NotificationClient = {
  write: (payload: string) => unknown;
};

const clients = new Map<number, Set<NotificationClient>>();
const advancedTypes: NotificationType[] = [
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "DORMANT_PRODUCT",
  "CLIENT_DEBT",
  "SUPPLIER_DEBT",
  "SUBSCRIPTION_EXPIRY",
  "LOW_MARGIN",
  "CASH_DISCREPANCY",
];
let evaluationRunning = false;

const splitStockAlerts = <T extends StockAlertProductDto>(products: T[]): StockAlertsDto => {
  const lowStock = products.filter(
    (product) => product.quantity > 0 && product.quantity <= product.alertThreshold,
  );
  const outOfStock = products.filter((product) => product.quantity <= 0);
  return { lowStock, outOfStock, total: lowStock.length + outOfStock.length };
};

const eventPayload = (event: string, data: NotificationEventDto) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const serializeNotification = (notification: any): NotificationDto => ({
  id: notification.id,
  shopId: notification.shopId,
  type: notification.type,
  severity: notification.severity,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType ?? null,
  entityId: notification.entityId ?? null,
  deduplicationKey: notification.deduplicationKey,
  metadata:
    notification.metadata && typeof notification.metadata === "object"
      ? (notification.metadata as Record<string, unknown>)
      : null,
  readAt: notification.readAt?.toISOString() ?? null,
  resolvedAt: notification.resolvedAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
  updatedAt: notification.updatedAt.toISOString(),
});

const assertAdvancedPlan = async (shopId: number, shopOwnerId: number) => {
  const subscription = await PlanChecker.plan(shopId, shopOwnerId);
  if (
    ["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) ||
    !["PRO", "PREMIUM"].includes(subscription.plan.code)
  ) {
    throw new ForbiddenError("Opération non autorisée");
  }
  return subscription;
};

const daysFromNow = (date: Date, now: Date) =>
  Math.ceil((date.getTime() - now.getTime()) / 86_400_000);

export const NotificationService = {
  addClient: (shopId: number, client: NotificationClient) => {
    if (!clients.has(shopId)) clients.set(shopId, new Set());
    clients.get(shopId)!.add(client);
    return clients.get(shopId)!.size;
  },

  removeClient: (shopId: number, client: NotificationClient) => {
    const shopClients = clients.get(shopId);
    if (!shopClients) return 0;
    shopClients.delete(client);
    if (shopClients.size === 0) clients.delete(shopId);
    return shopClients.size;
  },

  writeToClient: (client: NotificationClient, event: string, data: NotificationEventDto) => {
    const validated = NotificationSchemas.event(event, data);
    client.write(eventPayload(validated.event, validated.data));
  },

  sendToShop: (shopId: number, event: string, data: NotificationEventDto) => {
    const validated = NotificationSchemas.event(event, data);
    const shopClients = clients.get(shopId);
    if (!shopClients || shopClients.size === 0) return 0;

    let delivered = 0;
    shopClients.forEach((client) => {
      try {
        NotificationService.writeToClient(client, validated.event, validated.data);
        delivered += 1;
      } catch {
        shopClients.delete(client);
      }
    });

    if (shopClients.size === 0) clients.delete(shopId);
    return delivered;
  },

  getInitialStockAlerts: async (shopId: number) => {
    const products = await NotificationRepository.findProductsForStream(shopId);
    return splitStockAlerts(products);
  },

  getStockAlerts: async (shopId: number) => {
    const products = await NotificationRepository.findProductsForStockAlerts(shopId);
    return splitStockAlerts(products);
  },

  getNotifications: async (shopId: number) => {
    const [notifications, unreadCount] = await Promise.all([
      NotificationRepository.findNotifications(shopId),
      NotificationRepository.countUnread(shopId),
    ]);
    return {
      notifications: notifications.map(serializeNotification),
      unreadCount,
    };
  },

  getPreferences: async (shopId: number) => NotificationRepository.findOrCreatePreferences(shopId),

  updatePreferences: async (shopId: number, data: UpdateNotificationPreferencesDto) => {
    const preferences = await NotificationRepository.updatePreferences(shopId, data);
    await NotificationService.evaluateShop(shopId);
    return preferences;
  },

  markRead: async (shopId: number, notificationId: number) => {
    const notification = await NotificationRepository.findNotificationByIdAndShop(
      notificationId,
      shopId,
    );
    if (!notification) throw new ForbiddenError("Opération non autorisée");
    await NotificationRepository.markRead(notificationId, shopId);
    NotificationService.sendToShop(shopId, "notification.updated", {
      id: notificationId,
      readAt: new Date().toISOString(),
    });
  },

  markAllRead: async (shopId: number) => {
    const result = await NotificationRepository.markAllRead(shopId);
    NotificationService.sendToShop(shopId, "notification.updated", {
      allRead: true,
      updatedCount: result.count,
    });
    return { updatedCount: result.count };
  },

  assertAdvancedAccess: assertAdvancedPlan,

  evaluateShop: async (shopId: number, now = new Date()): Promise<NotificationEvaluationDto> => {
    const preferences = await NotificationRepository.findOrCreatePreferences(shopId);
    if (!preferences.enabled) {
      const resolved = await NotificationRepository.resolveAll(shopId, advancedTypes);
      return { created: 0, reactivated: 0, resolved: resolved.count, unreadCount: 0 };
    }

    const dormantSince = new Date(now.getTime() - preferences.dormantDays * 86_400_000);
    const marginSince = new Date(now.getTime() - preferences.marginPeriodDays * 86_400_000);
    const data = await NotificationRepository.findEvaluationData(shopId, dormantSince, marginSince);
    const candidates: Array<{
      type: NotificationType;
      severity: NotificationSeverity;
      title: string;
      message: string;
      entityType?: string;
      entityId?: number;
      deduplicationKey: string;
      metadata?: Record<string, unknown>;
    }> = [];

    if (preferences.lowStockEnabled) {
      for (const product of data.products.filter(
        (product) => product.quantity > 0 && product.quantity <= product.alertThreshold,
      )) {
        candidates.push({
          type: "LOW_STOCK",
          severity: "WARNING",
          title: "Stock faible",
          message: `Le produit ${product.name} est presque épuisé (${product.quantity} unité(s)).`,
          entityType: "Product",
          entityId: product.id,
          deduplicationKey: `LOW_STOCK:product:${product.id}`,
          metadata: { quantity: product.quantity, alertThreshold: product.alertThreshold },
        });
      }
    }

    if (preferences.outOfStockEnabled) {
      for (const product of data.products.filter((product) => product.quantity <= 0)) {
        candidates.push({
          type: "OUT_OF_STOCK",
          severity: "CRITICAL",
          title: "Rupture de stock",
          message: `Le produit ${product.name} est en rupture de stock.`,
          entityType: "Product",
          entityId: product.id,
          deduplicationKey: `OUT_OF_STOCK:product:${product.id}`,
          metadata: { quantity: product.quantity },
        });
      }
    }

    if (preferences.dormantProductEnabled) {
      for (const product of data.products.filter(
        (product) =>
          product.quantity > 0 &&
          product.saleItems.length === 0 &&
          (!product.stockMovements[0] || product.stockMovements[0].createdAt <= dormantSince),
      )) {
        candidates.push({
          type: "DORMANT_PRODUCT",
          severity: "INFO",
          title: "Produit dormant",
          message: `Le produit ${product.name} n’a pas été vendu depuis ${preferences.dormantDays} jours.`,
          entityType: "Product",
          entityId: product.id,
          deduplicationKey: `DORMANT_PRODUCT:product:${product.id}`,
          metadata: { stockQuantity: product.quantity, dormantDays: preferences.dormantDays },
        });
      }
    }

    if (preferences.clientDebtEnabled) {
      for (const client of data.clients) {
        const amountDue = client.sales.reduce(
          (sum, sale) =>
            sum + sale.remaining - sale.returns.reduce((refunds, item) => refunds + item.refundAmount, 0),
          0,
        );
        if (amountDue > preferences.clientDebtThreshold) {
          candidates.push({
            type: "CLIENT_DEBT",
            severity: "WARNING",
            title: "Créance client importante",
            message: `La créance nette de ${client.name} dépasse le seuil configuré.`,
            entityType: "Client",
            entityId: client.id,
            deduplicationKey: `CLIENT_DEBT:client:${client.id}`,
            metadata: { amountDue, threshold: preferences.clientDebtThreshold },
          });
        }
      }
    }

    if (preferences.supplierDebtEnabled) {
      for (const supplier of data.suppliers) {
        const remaining = supplier.supplierDebts
          .filter((debt) => debt.status !== "PAID")
          .reduce((sum, debt) => sum + debt.remaining, 0);
        if (remaining > preferences.supplierDebtThreshold) {
          candidates.push({
            type: "SUPPLIER_DEBT",
            severity: "WARNING",
            title: "Dette fournisseur importante",
            message: `La dette restante envers ${supplier.name} dépasse le seuil configuré.`,
            entityType: "Supplier",
            entityId: supplier.id,
            deduplicationKey: `SUPPLIER_DEBT:supplier:${supplier.id}`,
            metadata: { remaining, threshold: preferences.supplierDebtThreshold },
          });
        }
      }
    }

    if (preferences.subscriptionExpiryEnabled && data.subscription?.endDate) {
      const days = daysFromNow(data.subscription.endDate, now);
      if (days >= 0 && days <= preferences.subscriptionExpiryDays) {
        candidates.push({
          type: "SUBSCRIPTION_EXPIRY",
          severity: days <= 2 ? "CRITICAL" : "WARNING",
          title: "Abonnement bientôt expiré",
          message: `L’abonnement de la boutique expire dans ${days} jour(s).`,
          entityType: "Subscription",
          deduplicationKey: "SUBSCRIPTION_EXPIRY:shop",
          metadata: { daysRemaining: days, endDate: data.subscription.endDate.toISOString() },
        });
      }
    }

    if (preferences.marginEnabled) {
      let revenue = 0;
      let knownCost = 0;
      let lineCount = 0;
      let knownLineCount = 0;
      for (const sale of data.sales) {
        for (const item of sale.items) {
          lineCount += 1;
          revenue += item.totalAmount;
          if (item.costTotal !== null) {
            knownLineCount += 1;
            knownCost += item.costTotal;
          }
        }
      }
      if (lineCount > 0 && lineCount === knownLineCount && revenue > 0) {
        const marginRate = ((revenue - knownCost) / revenue) * 100;
        if (marginRate <= preferences.marginRateThreshold) {
          candidates.push({
            type: "LOW_MARGIN",
            severity: marginRate < 0 ? "CRITICAL" : "WARNING",
            title: "Marge faible",
            message: `La marge connue sur les ${preferences.marginPeriodDays} derniers jours est sous le seuil configuré.`,
            entityType: "Shop",
            entityId: shopId,
            deduplicationKey: "LOW_MARGIN:shop",
            metadata: {
              marginRate: Math.round(marginRate * 100) / 100,
              threshold: preferences.marginRateThreshold,
              periodDays: preferences.marginPeriodDays,
            },
          });
        }
      }
    }

    if (
      preferences.cashDiscrepancyEnabled &&
      data.reconciliation &&
      data.reconciliation.status !== "BALANCED"
    ) {
      candidates.push({
        type: "CASH_DISCREPANCY",
        severity: "CRITICAL",
        title: "Écart de caisse",
        message: `Le dernier rapprochement de caisse présente un écart (${data.reconciliation.status}).`,
        entityType: "CashReconciliation",
        entityId: data.reconciliation.id,
        deduplicationKey: `CASH_DISCREPANCY:reconciliation:${data.reconciliation.id}`,
        metadata: {
          status: data.reconciliation.status,
          difference: data.reconciliation.difference,
          createdAt: data.reconciliation.createdAt.toISOString(),
        },
      });
    }

    let created = 0;
    let reactivated = 0;
    for (const candidate of candidates) {
      const existing = await NotificationRepository.findActiveByKey(
        shopId,
        candidate.deduplicationKey,
      );
      if (!existing) {
        const notification = await NotificationRepository.createNotification({ shopId, ...candidate });
        created += 1;
        NotificationService.sendToShop(shopId, "notification.created", {
          notification: serializeNotification(notification),
        });
      } else if (existing.resolvedAt) {
        const notification = await NotificationRepository.reactivateNotification(existing.id, candidate);
        reactivated += 1;
        NotificationService.sendToShop(shopId, "notification.created", {
          notification: serializeNotification(notification),
        });
      }
    }

    const activeKeys = candidates.map((candidate) => candidate.deduplicationKey);
    const resolved = await NotificationRepository.resolveMissing(shopId, advancedTypes, activeKeys);
    const unreadCount = await NotificationRepository.countUnread(shopId);
    NotificationService.sendToShop(shopId, "notification.summary", { unreadCount });
    return { created, reactivated, resolved: resolved.count, unreadCount };
  },

  evaluateAllShops: async () => {
    if (evaluationRunning) return;
    evaluationRunning = true;
    try {
      const shops = await NotificationRepository.findShops();
      for (const shop of shops) {
        const subscription = await NotificationRepository.findCurrentPlan(shop.id);
        const eligible =
          subscription &&
          ["PRO", "PREMIUM"].includes(subscription.plan.code) &&
          !["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) &&
          (!subscription.endDate || subscription.endDate > new Date());
        if (eligible) await NotificationService.evaluateShop(shop.id);
        else await NotificationRepository.resolveAll(shop.id, advancedTypes);
      }
    } finally {
      evaluationRunning = false;
    }
  },

  startDailyScheduler: () => {
    const initialRun = setTimeout(() => {
      void NotificationService.evaluateAllShops().catch(() => undefined);
    }, 10000);
    const dailyRun = setInterval(() => {
      void NotificationService.evaluateAllShops().catch(() => undefined);
    }, 86_400_000);
    return () => {
      clearTimeout(initialRun);
      clearInterval(dailyRun);
    };
  },
};
