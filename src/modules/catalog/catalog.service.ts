import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors.js";

const assertPremium = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (subscription.plan.code !== "PREMIUM") throw new ForbiddenError("Le catalogue centralisé nécessite un plan Premium");
};

export const CatalogService = {
  list: async (ownerId: number, shopId: number) => {
    await assertPremium(ownerId, shopId);
    return prisma.catalogProduct.findMany({ where: { ownerId, isActive: true }, include: { prices: { include: { shop: { select: { id: true, name: true } } } } }, orderBy: { name: "asc" } });
  },
  create: async (ownerId: number, shopId: number, data: { reference: string; name: string; description?: string; purchasePrice: number; baseSalePrice: number }) => {
    await assertPremium(ownerId, shopId);
    if (!data.reference.trim() || !data.name.trim() || data.purchasePrice < 0 || data.baseSalePrice < 0) throw new BadRequestError("Données catalogue invalides");
    const product = await prisma.catalogProduct.create({ data: { ownerId, reference: data.reference.trim(), name: data.name.trim(), description: data.description?.trim(), purchasePrice: data.purchasePrice, baseSalePrice: data.baseSalePrice } });
    await prisma.businessAuditLog.create({ data: { shopId, actorId: ownerId, action: "CREATE_CATALOG_PRODUCT", entityType: "CatalogProduct", entityId: product.id, details: { reference: product.reference } } });
    return product;
  },
  setPrice: async (ownerId: number, shopId: number, catalogProductId: number, targetShopId: number, salePrice: number) => {
    await assertPremium(ownerId, shopId);
    if (salePrice < 0) throw new BadRequestError("Prix invalide");
    const [product, ownership] = await Promise.all([
      prisma.catalogProduct.findFirst({ where: { id: catalogProductId, ownerId, isActive: true } }),
      prisma.shopOwner.findFirst({ where: { userId: ownerId, shopId: targetShopId } }),
    ]);
    if (!product || !ownership) throw new NotFoundError("Ressource catalogue introuvable");
    const priceRule = await prisma.catalogPriceRule.upsert({ where: { catalogProductId_shopId: { catalogProductId, shopId: targetShopId } }, create: { catalogProductId, shopId: targetShopId, salePrice }, update: { salePrice } });
    await prisma.businessAuditLog.create({ data: { shopId, actorId: ownerId, action: "SET_CATALOG_SHOP_PRICE", entityType: "CatalogPriceRule", entityId: priceRule.id, details: { catalogProductId, targetShopId, salePrice } } });
    return priceRule;
  },
};
