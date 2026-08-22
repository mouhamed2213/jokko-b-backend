import { prisma } from "../../config/prisma.js";
import type { SaleItemDto, SaleListQueryDto, InvoiceListQueryDto } from "./sale.dto.js";

type DatabaseClient = any;

const saleInclude = {
  client: true,
  items: { include: { product: true } },
  payments: true,
} as const;

const invoiceInclude = {
  client: true,
  items: { include: { product: true } },
  payments: { orderBy: { paidAt: "asc" } },
} as const;

export const SaleRepository = {
  findOwnership: async (ownerUserId: number, shopId: number) => {
    return prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerUserId, shopId } },
      select: { id: true, userId: true, shopId: true },
    });
  },

  countByMonth: async (shopId: number, startOfMonth: Date) => {
    return prisma.sale.count({
      where: { shopId, createdAt: { gte: startOfMonth } },
    });
  },

  findProductsByIdsAndShop: async (
    productIds: number[],
    shopId: number,
  ) => {
    return prisma.product.findMany({
      where: { id: { in: productIds }, shopId, isActive: true },
    });
  },

  findClientByIdAndShop: async (clientId: number, shopId: number) => {
    return prisma.client.findFirst({ where: { id: clientId, shopId } });
  },

  generateInvoiceNumber: async (db: DatabaseClient, shopId: number) => {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    const count = await db.sale.count({
      where: {
        shopId,
        invoiceNumber: { not: null },
        createdAt: { gte: startOfYear, lt: endOfYear },
      },
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const sequence = String(count + 1 + attempt).padStart(5, "0");
      const candidate = `FAC-${year}-${sequence}`;
      const existing = await db.sale.findFirst({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }

    return `FAC-${year}-${Date.now()}`;
  },

  createSale: async (
    db: DatabaseClient,
    input: {
      shopId: number;
      userId: number;
      clientId?: number | null;
      customerName?: string;
      invoiceNumber: string;
      totalAmount: number;
      paidAmount: number;
      remaining: number;
      status: string;
      note?: string;
      items: Array<SaleItemDto & { unitCost?: number; costTotal?: number; marginAmount?: number }>;
      products: Array<{ id: number; name: string; imageUrl: string | null }>;
    },
  ) => {
    return db.sale.create({
      data: {
        shopId: input.shopId,
        userId: input.userId,
        clientId: input.clientId ?? null,
        customerName: input.customerName || null,
        invoiceNumber: input.invoiceNumber,
        totalAmount: input.totalAmount,
        paidAmount: input.paidAmount,
        remaining: input.remaining,
        status: input.status,
        note: input.note || null,
        items: {
          create: input.items.map((item) => {
            const product = input.products.find((entry) => entry.id === item.productId)!;
            return {
              productId: product.id,
              productName: product.name,
              productImageUrl: product.imageUrl,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost ?? null,
              costTotal: item.costTotal ?? null,
              marginAmount: item.marginAmount ?? null,
              totalAmount: item.unitPrice * item.quantity,
            };
          }),
        },
      },
      include: saleInclude,
    });
  },

  createPayment: async (
    db: DatabaseClient,
    saleId: number,
    input: { amount: number; note?: string; paymentMethod: string },
  ) => {
    return db.salePayment.create({
      data: {
        saleId,
        amount: input.amount,
        note: input.note || null,
        paymentMethod: input.paymentMethod,
      },
    });
  },

  updateSalePaymentState: async (
    db: DatabaseClient,
    saleId: number,
    input: { paidAmount: number; remaining: number; status: string },
  ) => {
    return db.sale.update({
      where: { id: saleId },
      data: input,
      include: invoiceInclude,
    });
  },

  findSaleByIdAndShop: async (
    saleId: number,
    shopId: number,
    db: DatabaseClient = prisma,
  ) => {
    return db.sale.findFirst({ where: { id: saleId, shopId }, include: invoiceInclude });
  },

  findSales: async (shopId: number, query: SaleListQueryDto) => {
    const where: any = { shopId };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { customerName: { contains: query.search } },
        { client: { name: { contains: query.search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return { data, total };
  },

  countAllByShop: async (shopId: number) => {
    return prisma.sale.count({ where: { shopId } });
  },

  findInvoices: async (shopId: number, query: InvoiceListQueryDto) => {
    const where: any = { shopId };
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search } },
        { customerName: { contains: query.search } },
        { client: { name: { contains: query.search } } },
        { client: { phone: { contains: query.search } } },
      ];
    }

    const [total, data, stats] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: invoiceInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.sale.aggregate({
        where: { shopId },
        _sum: { totalAmount: true, paidAmount: true, remaining: true },
        _count: true,
      }),
    ]);

    return { data, total, stats };
  },

  updateSale: async (
    db: DatabaseClient,
    saleId: number,
    input: {
      clientId?: number | null;
      customerName?: string;
      totalAmount: number;
      note?: string;
      items: Array<SaleItemDto & { unitCost?: number; costTotal?: number; marginAmount?: number }>;
      products: Array<{ id: number; name: string; imageUrl: string | null }>;
    },
  ) => {
    await db.saleItem.deleteMany({ where: { saleId } });
    return db.sale.update({
      where: { id: saleId },
      data: {
        clientId: input.clientId ?? null,
        customerName: input.customerName || null,
        totalAmount: input.totalAmount,
        paidAmount: 0,
        remaining: input.totalAmount,
        status: "UNPAID",
        note: input.note || null,
        items: {
          create: input.items.map((item) => {
            const product = input.products.find((entry) => entry.id === item.productId)!;
            return {
              productId: product.id,
              productName: product.name,
              productImageUrl: product.imageUrl,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost ?? null,
              costTotal: item.costTotal ?? null,
              marginAmount: item.marginAmount ?? null,
              totalAmount: item.unitPrice * item.quantity,
            };
          }),
        },
      },
      include: saleInclude,
    });
  },

  deleteSale: async (db: DatabaseClient, saleId: number) => {
    return db.sale.delete({ where: { id: saleId } });
  },

  updateProductQuantity: async (
    db: DatabaseClient,
    productId: number,
    shopId: number,
    delta: number,
  ) => {
    return db.product.updateMany({
      where:
        delta >= 0
          ? { id: productId, shopId }
          : { id: productId, shopId, quantity: { gte: Math.abs(delta) } },
      data:
        delta >= 0
          ? { quantity: { increment: delta } }
          : { quantity: { decrement: Math.abs(delta) } },
    });
  },

  createStockMovement: async (
    db: DatabaseClient,
    input: {
      shopId: number;
      productId: number;
      userId: number;
            type: "SALE" | "ENTRY" | "RETURN";

      quantity: number;
      unitCost?: number | null;
      note: string;
    },
  ) => {
    return db.stockMovement.create({ data: input });
  },

  findProductsForAlerts: async (
    db: DatabaseClient,
    productIds: number[],
    shopId: number,
  ) => {
    return db.product.findMany({
      where: { id: { in: productIds }, shopId },
      select: { id: true, name: true, quantity: true, alertThreshold: true },
    });
  },
};
