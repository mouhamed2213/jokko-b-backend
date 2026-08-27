import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { ProcurementService } from "../procurement/procurement.service.js";
import { StockRepository } from "../stock/stock.repository.js";
import type { CreatePurchaseOrderDto, PurchaseOrderListQueryDto, ReceivePurchaseOrderDto } from "./purchase-order.dto.js";
import { PurchaseOrderRepository } from "./purchase-order.repository.js";

const assertPlan = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (subscription.plan.code === "FREE" || subscription.plan.code === "BASIC") {
    throw new ForbiddenError("Opération non autorisée");
  }
};

const orderNumber = () => `BC-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
const receiptNumber = () => `REC-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

export const PurchaseOrderService = {
  getPurchaseOrders: async (ownerId: number, shopId: number, query: PurchaseOrderListQueryDto) => {
    await assertPlan(ownerId, shopId);
    return PurchaseOrderRepository.findManyByShop(shopId, query);
  },

  getPurchaseOrderById: async (ownerId: number, shopId: number, id: number) => {
    await assertPlan(ownerId, shopId);
    const order = await PurchaseOrderRepository.findByIdAndShop(id, shopId);
    if (!order) throw new NotFoundError("Ressource introuvable");
    return order;
  },

  createPurchaseOrder: async (ownerId: number, shopId: number, userId: number, data: CreatePurchaseOrderDto) => {
    await assertPlan(ownerId, shopId);
    const productIds = data.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) throw new BadRequestError("Données de commande invalides");

    const [supplier, products] = await Promise.all([
      PurchaseOrderRepository.findSupplierByIdAndShop(data.supplierId, shopId),
      PurchaseOrderRepository.findProductsByIdsAndShop(productIds, shopId),
    ]);
    if (!supplier || products.length !== productIds.length) throw new NotFoundError("Ressource introuvable");
    const productNames = new Map(products.map((product) => [product.id, product.name]));
    return PurchaseOrderRepository.create(
      shopId,
      userId,
      { ...data, items: data.items.map((item) => ({ ...item, productName: productNames.get(item.productId) })) },
      orderNumber(),
    );
  },

  markOrdered: async (ownerId: number, shopId: number, id: number) => {
    await assertPlan(ownerId, shopId);
    const order = await PurchaseOrderRepository.findByIdAndShop(id, shopId);
    if (!order) throw new NotFoundError("Ressource introuvable");
    if (order.status !== "DRAFT") throw new BadRequestError("Transition non autorisée");
    await PurchaseOrderRepository.updateStatus(prisma, id, "ORDERED");
    return PurchaseOrderRepository.findByIdAndShop(id, shopId);
  },

  cancel: async (ownerId: number, shopId: number, id: number) => {
    await assertPlan(ownerId, shopId);
    const order = await PurchaseOrderRepository.findByIdAndShop(id, shopId);
    if (!order) throw new NotFoundError("Ressource introuvable");
    if (!["DRAFT", "ORDERED"].includes(order.status)) throw new BadRequestError("Transition non autorisée");
    await PurchaseOrderRepository.updateStatus(prisma, id, "CANCELLED");
    return PurchaseOrderRepository.findByIdAndShop(id, shopId);
  },

  receivePurchaseOrder: async (
    ownerId: number,
    shopId: number,
    userId: number,
    id: number,
    data: ReceivePurchaseOrderDto,
  ) => {
    await assertPlan(ownerId, shopId);
    const result = await prisma.$transaction(async (db: any) => {
      const order = await PurchaseOrderRepository.findByIdAndShopInTransaction(db, id, shopId);
      if (!order || ["DRAFT", "CANCELLED", "RECEIVED"].includes(order.status)) {
        throw new NotFoundError("Ressource introuvable");
      }

      const requestedIds = data.items.map((item) => item.orderItemId);
      if (new Set(requestedIds).size !== requestedIds.length) throw new BadRequestError("Données de réception invalides");

      const receiptItems: Array<{ orderItemId: number; quantity: number; unitCost: number }> = [];
      let totalAmount = 0;
      for (const requested of data.items) {
        const orderItem = order.items.find((item: any) => item.id === requested.orderItemId);
        if (!orderItem || orderItem.quantityReceived + requested.quantity > orderItem.quantityOrdered) {
          throw new BadRequestError("Quantité reçue invalide");
        }
        const unitCost = requested.unitCost ?? orderItem.unitCost;
        const updated = await PurchaseOrderRepository.updateReceivedQuantity(db, orderItem.id, requested.quantity, orderItem.quantityOrdered);
        if (updated.count !== 1) throw new BadRequestError("Réception déjà traitée");
        const productUpdated = await StockRepository.applyEntryWithAverageCost(
          db,
          orderItem.productId,
          shopId,
          requested.quantity,
          unitCost,
        );
        if (productUpdated.count !== 1) throw new NotFoundError("Ressource introuvable");
        await StockRepository.createMovement(
          db,
          shopId,
          userId,
          { productId: orderItem.productId, quantity: requested.quantity, supplierId: order.supplierId, unitCost, note: data.note },
          "ENTRY",
        );
        receiptItems.push({ orderItemId: orderItem.id, quantity: requested.quantity, unitCost });
        totalAmount += requested.quantity * unitCost;
      }

      const paidAmount = data.paidAmount ?? 0;
      if (paidAmount > totalAmount) throw new BadRequestError("Montant invalide");
      const receipt = await PurchaseOrderRepository.createReceipt(db, id, shopId, userId, receiptNumber(), data.note, receiptItems);
      const debtResult = await ProcurementService.recordSupplierObligation(
        {
          shopId,
          supplierId: order.supplierId,
          supplierName: order.supplier.name,
          totalAmount,
          paidAmount,
          note: `Réception ${receipt.receiptNumber}`,
          paymentMethod: data.paymentMethod || "CASH",
          receiptId: receipt.id,
        },
        db,
      );
      const fullyReceived = order.items.every((item: any) => {
        const received = item.quantityReceived + (data.items.find((entry) => entry.orderItemId === item.id)?.quantity || 0);
        return received >= item.quantityOrdered;
      });
      const status = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
      await PurchaseOrderRepository.updateStatus(db, id, status);
      return { receipt, debt: debtResult.debt, payment: debtResult.payment, status };
    });
    return result;
  },
};
