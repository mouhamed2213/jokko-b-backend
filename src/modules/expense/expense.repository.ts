import { prisma } from "../../config/prisma.js";
import type { DatabaseClient, ExpenseListQueryDto } from "./expense.dto.js";

const expenseInclude = {
  user: { select: { id: true, name: true } },
  cashTransaction: {
    select: {
      id: true,
      type: true,
      amount: true,
      label: true,
      reference: true,
      paymentMethod: true,
      cashRegisterId: true,
      createdAt: true,
    },
  },
} as const;

const buildWhere = (shopId: number, query: Partial<ExpenseListQueryDto> = {}) => ({
  shopId,
  ...(query.category ? { category: query.category } : {}),
  ...(query.from || query.to
    ? {
        createdAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      }
    : {}),
});

export const ExpenseRepository = {
  findOwnership: async (db: DatabaseClient, ownerId: number, shopId: number) =>
    db.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerId, shopId } },
      select: { id: true },
    }),

  findByIdempotencyKey: async (
    db: DatabaseClient,
    shopId: number,
    idempotencyKey: string,
  ) =>
    db.expense.findUnique({
      where: { shopId_idempotencyKey: { shopId, idempotencyKey } },
      include: expenseInclude,
    }),

  create: async (
    db: DatabaseClient,
    input: {
      shopId: number;
      userId: number;
      cashTransactionId: number;
      idempotencyKey: string;
      category: string;
      amount: number;
      description?: string;
      reference?: string;
      paymentMethod?: string;
    },
  ) =>
    db.expense.create({
      data: {
        shopId: input.shopId,
        userId: input.userId,
        cashTransactionId: input.cashTransactionId,
        idempotencyKey: input.idempotencyKey,
        category: input.category,
        amount: input.amount,
        description: input.description || null,
        reference: input.reference || null,
        paymentMethod: input.paymentMethod || "CASH",
      },
      include: expenseInclude,
    }),

  findMany: async (
    db: DatabaseClient,
    shopId: number,
    query: ExpenseListQueryDto,
  ) =>
    db.expense.findMany({
      where: buildWhere(shopId, query),
      include: expenseInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),

  count: async (db: DatabaseClient, shopId: number, query: ExpenseListQueryDto) =>
    db.expense.count({ where: buildWhere(shopId, query) }),

  findById: async (db: DatabaseClient, shopId: number, id: number) =>
    db.expense.findFirst({
      where: { id, shopId },
      include: expenseInclude,
    }),

  aggregate: async (db: DatabaseClient, shopId: number, query: Partial<ExpenseListQueryDto>) =>
    db.expense.aggregate({
      where: buildWhere(shopId, query),
      _sum: { amount: true },
      _count: { _all: true },
    }),

  groupByCategory: async (
    db: DatabaseClient,
    shopId: number,
    query: Partial<ExpenseListQueryDto>,
  ) =>
    db.expense.groupBy({
      by: ["category"],
      where: buildWhere(shopId, query),
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    }),

  client: prisma,
};
