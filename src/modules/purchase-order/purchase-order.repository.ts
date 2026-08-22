import { prisma } from "../../config/prisma.js";
import type { CreatePurchaseOrderDto, PurchaseOrderListQueryDto } from "./purchase-order.dto.js";

type DatabaseClient = any;

const orderInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true, reference: true } } },
    orderBy: { id: "asc" },
  },
  receipts: {
    include: { items: true, user: { select: { id: true, name: true } } },
    orderBy: { receivedAt: "desc" },
  },
} as const;

export const PurchaseOrderRepository = {
  findSupplierByIdAndShop: async (supplierId: number, shopId: number) =>
    prisma.supplier.findFirst({ where: { id: supplierId, shopId }, select: { id: true, name: true } }),

  findProductsByIdsAndShop: async (productIds: number[], shopId: number) =>
    prisma.product.findMany({ where: { id: { in: productIds }, shopId }, select: { id: true, name: true } }),

  findManyByShop: async (shopId: number, query: PurchaseOrderListQueryDto) => {
    const where = { shopId, ...(query.status ? { status: query.status } : {}) };
    const [total, data] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } }, items: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return { data, total, page: query.page, limit: query.limit };
  },

  findByIdAndShop: async (id: number, shopId: number) =>
    prisma.purchaseOrder.findFirst({ where: { id, shopId }, include: orderInclude }),

  findByIdAndShopInTransaction: async (db: DatabaseClient, id: number, shopId: number) =>
    db.purchaseOrder.findFirst({ where: { id, shopId }, include: { supplier: true, items: true } }),

  create: async (shopId: number, createdById: number, data: CreatePurchaseOrderDto, orderNumber: string) => {
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantityOrdered * item.unitCost, 0);
    return prisma.purchaseOrder.create({
      data: {
        shopId,
        supplierId: data.supplierId,
        createdById,
        orderNumber,
        totalAmount,
        note: data.note,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            productName: item.productName || "Produit",
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            totalAmount: item.quantityOrdered * item.unitCost,
          })),
        },
      },
      include: orderInclude,
    });
  },

  updateStatus: async (db: DatabaseClient, id: number, status: string) =>
    db.purchaseOrder.update({ where: { id }, data: { status } }),

  createReceipt: async (
    db: DatabaseClient,
    orderId: number,
    shopId: number,
    userId: number,
    receiptNumber: string,
    note: string | undefined,
    items: Array<{ orderItemId: number; quantity: number; unitCost: number }>,
  ) => db.purchaseReceipt.create({
    data: {
      purchaseOrderId: orderId,
      shopId,
      userId,
      receiptNumber,
      note,
      items: { create: items.map((item) => ({ purchaseOrderItemId: item.orderItemId, quantity: item.quantity, unitCost: item.unitCost, totalAmount: item.quantity * item.unitCost })) },
    },
    include: { items: true },
  }),

  updateReceivedQuantity: async (db: DatabaseClient, id: number, quantity: number, maxQuantityReceived: number) =>
    db.purchaseOrderItem.updateMany({
      where: { id, quantityReceived: { lte: maxQuantityReceived - quantity } },
      data: { quantityReceived: { increment: quantity } },
    }),
};
