import { prisma } from "../../config/prisma.js";

type DatabaseClient = any;

export const CashRepository = {
  findOpenRegister: async (shopId: number, db: DatabaseClient = prisma) => {
    return db.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
    });
  },

  findOpenRegisterWithTransactions: async (
    shopId: number,
    db: DatabaseClient = prisma,
  ) => {
    return db.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        user: { select: { name: true } },
      },
    });
  },

  findRegisterByIdAndShop: async (
    id: number,
    shopId: number,
    db: DatabaseClient = prisma,
  ) => {
    return db.cashRegister.findFirst({
      where: { id, shopId },
      include: {
        transactions: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true } },
        reconciliation: true,
      },
    });
  },

  findOpenRegisterByIdAndShop: async (
    id: number,
    shopId: number,
    db: DatabaseClient = prisma,
  ) => {
    return db.cashRegister.findFirst({
      where: { id, shopId, status: "OPEN" },
      include: { transactions: true },
    });
  },

  createRegister: async (
    db: DatabaseClient,
    input: { shopId: number; userId: number; openingAmount: number; note?: string },
  ) => {
    return db.cashRegister.create({
      data: {
        shopId: input.shopId,
        userId: input.userId,
        openingAmount: input.openingAmount,
        note: input.note || null,
      },
    });
  },

    findReconciliationByRegisterIdAndShop: async (
    db: DatabaseClient,
    registerId: number,
    shopId: number,
  ) =>
    db.cashReconciliation.findFirst({
      where: { cashRegisterId: registerId, shopId },
      include: { user: { select: { id: true, name: true } } },
    }),

  createReconciliation: async (
    db: DatabaseClient,
    input: {
      shopId: number;
      cashRegisterId: number;
      userId: number;
      expectedAmount: number;
      countedAmount: number;
      difference: number;
      status: string;
      note?: string;
    },
  ) =>
    db.cashReconciliation.create({
      data: {
        shopId: input.shopId,
        cashRegisterId: input.cashRegisterId,
        userId: input.userId,
        expectedAmount: input.expectedAmount,
        countedAmount: input.countedAmount,
        difference: input.difference,
        status: input.status,
        note: input.note || null,
      },
      include: { user: { select: { id: true, name: true } } },
    }),

  closeRegister: async (

    db: DatabaseClient,
    id: number,
    closingAmount: number,
    note?: string,
  ) => {
    return db.cashRegister.update({
      where: { id },
      data: {
        status: "CLOSED",
        closingAmount,
        closedAt: new Date(),
        ...(note === undefined ? {} : { note: note || null }),
      },
      include: {
        transactions: true,
        user: { select: { name: true } },
      },
    });
  },

  createTransaction: async (
    db: DatabaseClient,
    input: {
      cashRegisterId: number;
      type: "IN" | "OUT";
      amount: number;
      label: string;
      reference?: string | null;
      paymentMethod?: string;
    },
  ) => {
    const transaction = await db.cashTransaction.create({
      data: {
        cashRegisterId: input.cashRegisterId,
        type: input.type,
        amount: input.amount,
        label: input.label,
        reference: input.reference ?? null,
        paymentMethod: input.paymentMethod ?? "CASH",
      },
    });

    await db.cashRegister.update({
      where: { id: input.cashRegisterId },
      data:
        input.type === "IN"
          ? { totalIn: { increment: input.amount } }
          : { totalOut: { increment: input.amount } },
    });

    return transaction;
  },

  countRegisters: async (shopId: number) => {
    return prisma.cashRegister.count({ where: { shopId } });
  },

  findRegisters: async (shopId: number, page: number, limit: number) => {
    return prisma.cashRegister.findMany({
      where: { shopId },
      include: {
        user: { select: { name: true } },
        transactions: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  },
};
