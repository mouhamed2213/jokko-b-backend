import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors.js";
import type { CreateStockTransferDto, StockTransferListQueryDto } from "./stock-transfer.dto.js";
import { StockTransferRepository } from "./stock-transfer.repository.js";

const assertPremiumFeature = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (!["PRO", "PREMIUM"].includes(subscription.plan.code)) {
    throw new ForbiddenError("Les transferts inter-boutiques nécessitent un plan Pro ou Premium");
  }
};

const reference = () => `TR-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

export const StockTransferService = {
  list: async (ownerId: number, shopId: number, query: StockTransferListQueryDto) => {
    await assertPremiumFeature(ownerId, shopId);
    const ownership = await StockTransferRepository.ownedShop(ownerId, shopId);
    if (!ownership) throw new ForbiddenError("Boutique non autorisée");
    return StockTransferRepository.findManyByShop(shopId, query);
  },

  detail: async (ownerId: number, shopId: number, id: number) => {
    await assertPremiumFeature(ownerId, shopId);
    const transfer = await StockTransferRepository.findById(id);
    if (!transfer || (transfer.sourceShopId !== shopId && transfer.destinationShopId !== shopId)) {
      throw new NotFoundError("Transfert introuvable");
    }
    return transfer;
  },

  create: async (ownerId: number, shopId: number, userId: number, data: CreateStockTransferDto) => {
    await assertPremiumFeature(ownerId, shopId);
    if (data.destinationShopId === shopId) throw new BadRequestError("La boutique destination doit être différente");
    const [sourceOwnership, destinationOwnership] = await Promise.all([
      StockTransferRepository.ownedShop(ownerId, shopId),
      StockTransferRepository.ownedShop(ownerId, data.destinationShopId),
    ]);
    if (!sourceOwnership || !destinationOwnership) throw new ForbiddenError("Les boutiques doivent appartenir au même compte");

    const sourceIds = data.items.map((item) => item.sourceProductId);
    const destinationIds = data.items.flatMap((item) => item.destinationProductId ? [item.destinationProductId] : []);
    const [sourceProducts, destinationProducts] = await Promise.all([
      StockTransferRepository.findProductsByIdsAndShop(sourceIds, shopId),
      destinationIds.length ? StockTransferRepository.findProductsByIdsAndShop(destinationIds, data.destinationShopId) : Promise.resolve([] as Array<{ id: number; name: string; quantity: number; reference: string | null }>),
    ]);
    if (sourceProducts.length !== sourceIds.length || destinationProducts.length !== destinationIds.length) {
      throw new NotFoundError("Produit source ou destination introuvable");
    }
    const sourceMap = new Map(sourceProducts.map((product) => [product.id, product]));
    const destinationMap = new Map(destinationProducts.map((product) => [product.id, product]));
    const resolvedItems = [] as Array<{ sourceProductId: number; destinationProductId: number; quantity: number; productName: string }>;
    for (const item of data.items) {
      const source = sourceMap.get(item.sourceProductId);
      if (!source || source.quantity < item.quantity) throw new BadRequestError(`Stock insuffisant pour ${source?.name || "le produit"}`);
      const destination = item.destinationProductId
        ? destinationMap.get(item.destinationProductId)
        : await StockTransferRepository.findProductByReferenceOrName(data.destinationShopId, source.reference, source.name);
      if (!destination) throw new NotFoundError(`Produit destination introuvable pour ${source.name}`);
      if (source.reference && destination.reference && source.reference !== destination.reference) {
        throw new BadRequestError(`Les produits source et destination ne correspondent pas pour ${source.name}`);
      }
      resolvedItems.push({ sourceProductId: source.id, destinationProductId: destination.id, quantity: item.quantity, productName: source.name });
    }
    return StockTransferRepository.create({
      sourceShopId: shopId,
      destinationShopId: data.destinationShopId,
      createdById: userId,
      reference: reference(),
      note: data.note,
      items: resolvedItems,
    });
  },

  ship: async (ownerId: number, shopId: number, id: number) => {
    await assertPremiumFeature(ownerId, shopId);
    const transfer = await StockTransferRepository.findById(id);
    if (!transfer || transfer.sourceShopId !== shopId) throw new NotFoundError("Transfert introuvable");
    if (transfer.status !== "DRAFT") throw new BadRequestError("Seul un transfert brouillon peut être expédié");
    await prisma.$transaction(async (db: any) => {
      for (const item of transfer.items) {
        const updated = await db.product.updateMany({ where: { id: item.sourceProductId, shopId, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity } } });
        if (updated.count !== 1) throw new BadRequestError("Stock insuffisant ou transfert déjà traité");
        await db.stockMovement.create({ data: { shopId, productId: item.sourceProductId, type: "TRANSFER_OUT", quantity: item.quantity, note: `Transfert ${transfer.reference}` } });
      }
      await db.stockTransfer.update({ where: { id }, data: { status: "SHIPPED", shippedAt: new Date() } });
    });
    return StockTransferRepository.findById(id);
  },

  receive: async (ownerId: number, shopId: number, id: number) => {
    await assertPremiumFeature(ownerId, shopId);
    const transfer = await StockTransferRepository.findById(id);
    if (!transfer || transfer.destinationShopId !== shopId) throw new NotFoundError("Transfert introuvable");
    if (transfer.status !== "SHIPPED") throw new BadRequestError("Seul un transfert expédié peut être réceptionné");
    await prisma.$transaction(async (db: any) => {
      for (const item of transfer.items) {
        await db.product.update({ where: { id: item.destinationProductId }, data: { quantity: { increment: item.quantity } } });
        await db.stockMovement.create({ data: { shopId, productId: item.destinationProductId, type: "TRANSFER_IN", quantity: item.quantity, note: `Transfert ${transfer.reference}` } });
      }
      await db.stockTransfer.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } });
    });
    return StockTransferRepository.findById(id);
  },

  cancel: async (ownerId: number, shopId: number, id: number) => {
    await assertPremiumFeature(ownerId, shopId);
    const transfer = await StockTransferRepository.findById(id);
    if (!transfer || transfer.sourceShopId !== shopId) throw new NotFoundError("Transfert introuvable");
    if (transfer.status !== "DRAFT") throw new BadRequestError("Seul un transfert brouillon peut être annulé");
    return prisma.stockTransfer.update({ where: { id }, data: { status: "CANCELLED" }, include: { items: true } });
  },
};
