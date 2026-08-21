import { prisma } from "../../config/prisma.js";
import type {
  StockEntryDto,
  StockMovementQueryDto,
  StockOutDto,
} from "./stock.dto.js";

type DatabaseClient = any;

export const StockRepository = {
  findProductByIdAndShop: async (id: number, shopId: number) => {
    return prisma.product.findFirst({
      where: { id, shopId },
    });
  },

  findSupplierByIdAndShop: async (id: number, shopId: number) => {
    return prisma.supplier.findFirst({
      where: { id, shopId },
      select: { id: true, name: true, shopId: true },
    });
  },

  incrementProductQuantity: async (
    db: DatabaseClient,
    productId: number,
    shopId: number,
    quantity: number,
  ) => {
    return db.product.updateMany({
      where: { id: productId, shopId },
      data: { quantity: { increment: quantity } },
    });
  },

  decrementProductQuantity: async (
    db: DatabaseClient,
    productId: number,
    shopId: number,
    quantity: number,
  ) => {
    return db.product.updateMany({
      where: { id: productId, shopId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
  },

  findProductByIdInTransaction: async (
    db: DatabaseClient,
    id: number,
    shopId: number,
  ) => {
    return db.product.findFirst({ where: { id, shopId } });
  },

  createMovement: async (
    db: DatabaseClient,
    shopId: number,
    userId: number,
    data: StockEntryDto | StockOutDto,
    type: "ENTRY" | "OUT",
  ) => {
    return db.stockMovement.create({
      data: {
        shopId,
        productId: data.productId,
        userId,
        supplierId: "supplierId" in data ? data.supplierId ?? null : null,
        type,
        quantity: data.quantity,
        unitCost: "unitCost" in data ? data.unitCost ?? null : null,
        note: data.note || null,
      },
      include: {
        product: true,
        user: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });
  },

  findMovements: async (shopId: number, query: StockMovementQueryDto) => {
    const where = {
      shopId,
      ...(query.productId === undefined ? {} : { productId: query.productId }),
      ...(query.type ? { type: query.type } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          user: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return { data, total };
  },
};
