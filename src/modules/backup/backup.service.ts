import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";

const assertPremium = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (subscription.plan.code !== "PREMIUM") throw new ForbiddenError("La sauvegarde assistée nécessite un plan Premium");
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
};
