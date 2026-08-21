import { prisma } from "../../config/prisma.js";
import type {
  CreateSupplierDebtDto,
  CreateSupplierDto,
  CreateSupplierPaymentDto,
  UpdateSupplierDto,
} from "./supplier.dto.js";

type DatabaseClient = any;

const listInclude = {
  supplierDebts: {
    include: { payments: true },
    orderBy: { createdAt: "desc" },
  },
  _count: { select: { stockMovements: true } },
} as const;

export const SupplierRepository = {
  findOwnership: async (ownerUserId: number, shopId: number) => {
    return prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerUserId, shopId } },
      select: { id: true, userId: true, shopId: true },
    });
  },

  findManyByShop: async (shopId: number) => {
    return prisma.supplier.findMany({
      where: { shopId },
      include: listInclude,
      orderBy: { name: "asc" },
    });
  },

  findByIdAndShop: async (id: number, shopId: number) => {
    return prisma.supplier.findFirst({
      where: { id, shopId },
      include: {
        supplierDebts: {
          include: { payments: true },
          orderBy: { createdAt: "desc" },
        },
        stockMovements: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  },

  create: async (shopId: number, data: CreateSupplierDto) => {
    return prisma.supplier.create({
      data: {
        shopId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      },
    });
  },

  update: async (id: number, data: UpdateSupplierDto) => {
    return prisma.supplier.update({ where: { id }, data });
  },

  delete: async (id: number) => {
    return prisma.supplier.delete({ where: { id } });
  },

  findDebtByIdAndSupplier: async (
    debtId: number,
    supplierId: number,
    db: DatabaseClient = prisma,
  ) => {
    return db.supplierDebt.findFirst({
      where: { id: debtId, supplierId },
    });
  },

  createDebt: async (
    db: DatabaseClient,
    supplierId: number,
    data: CreateSupplierDebtDto,
  ) => {
    const remaining = data.totalAmount - data.paidAmount;
    return db.supplierDebt.create({
      data: {
        supplierId,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount,
        remaining,
        status: remaining <= 0 ? "PAID" : data.paidAmount > 0 ? "PARTIAL" : "UNPAID",
        note: data.note || null,
      },
    });
  },

  createPayment: async (
    db: DatabaseClient,
    debtId: number,
    data: CreateSupplierPaymentDto,
  ) => {
    return db.supplierPayment.create({
      data: {
        debtId,
        amount: data.amount,
        note: data.note || null,
        paymentMethod: data.paymentMethod,
      },
    });
  },

  updateDebt: async (
    db: DatabaseClient,
    debtId: number,
    data: {
      paidAmount: number;
      remaining: number;
      status: string;
    },
  ) => {
    return db.supplierDebt.update({ where: { id: debtId }, data });
  },
};
