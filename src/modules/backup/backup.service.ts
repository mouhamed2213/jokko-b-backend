import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";

const assertPremium = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (subscription.plan.code !== "PREMIUM") throw new ForbiddenError("La sauvegarde assistée nécessite un plan Premium");
};

const validateSnapshot = (snapshot: unknown) => {
  if (!snapshot || typeof snapshot !== "object") throw new ForbiddenError("Format de sauvegarde invalide");
  const candidate = snapshot as { format?: string; version?: number; shops?: unknown[]; products?: unknown[]; categories?: unknown[]; clients?: unknown[]; suppliers?: unknown[] };
  if (candidate.format !== "jokko-business-backup" || candidate.version !== 1) throw new ForbiddenError("Version de sauvegarde non supportée");
  for (const key of ["shops", "products", "categories", "clients", "suppliers"] as const) if (!Array.isArray(candidate[key])) throw new ForbiddenError(`Section ${key} invalide`);
  return candidate;
};

export const BackupService = {
  snapshot: async (ownerId: number, shopId: number) => {
    await assertPremium(ownerId, shopId);
    const owned = await prisma.shopOwner.findMany({ where: { userId: ownerId }, select: { shopId: true } });
    const shopIds = owned.map((item) => item.shopId);
    const shops = await prisma.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true, ownerName: true, email: true, phone: true, address: true, status: true, currentShop: true, createdAt: true, updatedAt: true } });
    const [products, categories, clients, suppliers] = await Promise.all([
      prisma.product.findMany({ where: { shopId: { in: shopIds } }, select: { id: true, shopId: true, categoryId: true, name: true, description: true, reference: true, quantity: true, purchasePrice: true, salePrice: true, semiWholesalePrice: true, wholesalePrice: true, alertThreshold: true, isActive: true, createdAt: true, updatedAt: true } }),
      prisma.category.findMany({ where: { shopId: { in: shopIds } } }),
      prisma.client.findMany({ where: { shopId: { in: shopIds } } }),
      prisma.supplier.findMany({ where: { shopId: { in: shopIds } } }),
    ]);
    return { format: "jokko-business-backup", version: 1, generatedAt: new Date().toISOString(), ownerId, shops, products, categories, clients, suppliers };
  },
  validateRestore: async (ownerId: number, shopId: number, snapshot: unknown) => {
    await assertPremium(ownerId, shopId);
    const candidate = validateSnapshot(snapshot);
    const owned = await prisma.shopOwner.findMany({ where: { userId: ownerId }, select: { shopId: true } });
    const ownedShopIds = new Set(owned.map((item) => item.shopId));
    const foreignShops = (candidate.shops ?? []).filter((item) => typeof item === "object" && item !== null && !ownedShopIds.has(Number((item as { id?: number }).id)));
    return { valid: foreignShops.length === 0, version: candidate.version, counts: { shops: candidate.shops?.length ?? 0, products: candidate.products?.length ?? 0, categories: candidate.categories?.length ?? 0, clients: candidate.clients?.length ?? 0, suppliers: candidate.suppliers?.length ?? 0 }, warnings: foreignShops.length ? ["Le fichier contient des boutiques qui ne sont pas rattachées à ce compte"] : ["Aucune donnée n’a été modifiée. Une restauration transactionnelle nécessitera une confirmation et un aperçu supplémentaires."] };
  },
};
