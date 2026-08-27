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
    const allRows = [...(candidate.products ?? []), ...(candidate.categories ?? []), ...(candidate.clients ?? []), ...(candidate.suppliers ?? [])];
    const foreignRows = allRows.filter((item) => typeof item === "object" && item !== null && !ownedShopIds.has(Number((item as { shopId?: number }).shopId)));
    const foreignShops = (candidate.shops ?? []).filter((item) => typeof item === "object" && item !== null && !ownedShopIds.has(Number((item as { id?: number }).id)));
    return { valid: foreignRows.length === 0 && foreignShops.length === 0, version: candidate.version, counts: { shops: candidate.shops?.length ?? 0, products: candidate.products?.length ?? 0, categories: candidate.categories?.length ?? 0, clients: candidate.clients?.length ?? 0, suppliers: candidate.suppliers?.length ?? 0 }, warnings: foreignRows.length || foreignShops.length ? ["Le fichier contient des boutiques qui ne sont pas rattachées à ce compte"] : ["Aucune donnée n’a été modifiée. Une restauration transactionnelle nécessitera une confirmation et un aperçu supplémentaires."] };
  },
  restore: async (ownerId: number, shopId: number, snapshot: unknown, confirm: boolean) => {
    if (!confirm) throw new ForbiddenError("La restauration nécessite une confirmation explicite");
    const preview = await BackupService.validateRestore(ownerId, shopId, snapshot);
    if (!preview.valid) throw new ForbiddenError("La restauration a été bloquée : périmètre de boutiques invalide");
    const candidate = validateSnapshot(snapshot);
    const row = (item: unknown) => item as Record<string, unknown>;
    const shopIdOf = (item: unknown) => Number(row(item).shopId);
    const base = (item: unknown) => { const data = { ...row(item) }; delete data.id; delete data.createdAt; delete data.updatedAt; return data; };
    await prisma.$transaction(async (tx) => {
      for (const item of candidate.shops ?? []) { const value = row(item); await tx.shop.update({ where: { id: Number(value.id) }, data: { name: String(value.name), ownerName: String(value.ownerName), email: String(value.email), phone: String(value.phone), address: value.address == null ? null : String(value.address), status: String(value.status), currentShop: String(value.currentShop) as never } }); }
      for (const item of candidate.categories ?? []) { const value = row(item); await tx.category.upsert({ where: { id: Number(value.id) }, create: { id: Number(value.id), shopId: shopIdOf(item), name: String(value.name) }, update: { shopId: shopIdOf(item), name: String(value.name) } }); }
      for (const item of candidate.clients ?? []) { const value = row(item); await tx.client.upsert({ where: { id: Number(value.id) }, create: { id: Number(value.id), ...base(item), shopId: shopIdOf(item), name: String(value.name), phone: String(value.phone) }, update: { ...base(item), shopId: shopIdOf(item), name: String(value.name), phone: String(value.phone) } }); }
      for (const item of candidate.suppliers ?? []) { const value = row(item); await tx.supplier.upsert({ where: { id: Number(value.id) }, create: { id: Number(value.id), ...base(item), shopId: shopIdOf(item), name: String(value.name) }, update: { ...base(item), shopId: shopIdOf(item), name: String(value.name) } }); }
      for (const item of candidate.products ?? []) { const value = row(item); const categoryId = value.categoryId == null ? null : Number(value.categoryId); const category = categoryId == null ? null : await tx.category.findFirst({ where: { id: categoryId, shopId: shopIdOf(item) }, select: { id: true } }); await tx.product.upsert({ where: { id: Number(value.id) }, create: { id: Number(value.id), ...base(item), shopId: shopIdOf(item), name: String(value.name), purchasePrice: Number(value.purchasePrice), salePrice: Number(value.salePrice), categoryId: category?.id ?? null }, update: { ...base(item), shopId: shopIdOf(item), name: String(value.name), purchasePrice: Number(value.purchasePrice), salePrice: Number(value.salePrice), categoryId: category?.id ?? null } }); }
    });
    return { restored: true, counts: preview.counts };
  },
};
