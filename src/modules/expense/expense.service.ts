import { prisma } from "../../config/prisma.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import { CashService } from "../cash/cash.service.js";
import type {
  CreateExpenseDto,
  ExpenseListQueryDto,
  ExpenseSummary,
} from "./expense.dto.js";
import { ExpenseRepository } from "./expense.repository.js";

const assertIdempotencyKey = (idempotencyKey: string) => {
  if (!idempotencyKey || idempotencyKey.length > 120) {
    throw new BadRequestError("Requête invalide");
  }
};

const assertFeatureAccess = async (ownerId: number, shopId: number) => {
  const ownership = await ExpenseRepository.findOwnership(prisma, ownerId, shopId);
  if (!ownership) throw new UnauthorizedError("Accès non autorisé");

  const subscription = await PlanChecker.plan(shopId, ownership.id);
  if (
    ["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) ||
    !subscription.features.includes("CASH_CONTROL" as never)
  ) {
    throw new ForbiddenError("Opération non autorisée");
  }

  return ownership;
};

const mapExpense = (expense: any) => ({
  id: expense.id,
  shopId: expense.shopId,
  userId: expense.userId,
  cashTransactionId: expense.cashTransactionId,
  idempotencyKey: expense.idempotencyKey,
  category: expense.category,
  amount: expense.amount,
  description: expense.description,
  reference: expense.reference,
  paymentMethod: expense.paymentMethod,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
  user: expense.user
    ? { id: expense.user.id, name: expense.user.name }
    : null,
  cashTransaction: expense.cashTransaction
    ? {
        id: expense.cashTransaction.id,
        type: expense.cashTransaction.type,
        amount: expense.cashTransaction.amount,
        label: expense.cashTransaction.label,
        reference: expense.cashTransaction.reference,
        paymentMethod: expense.cashTransaction.paymentMethod,
        cashRegisterId: expense.cashTransaction.cashRegisterId,
        createdAt: expense.cashTransaction.createdAt,
      }
    : null,
});

const buildSummary = (aggregate: any, groups: any[]): ExpenseSummary => ({
  totalAmount: aggregate._sum.amount || 0,
  expenseCount: aggregate._count._all || 0,
  byCategory: groups.map((group) => ({
    category: group.category,
    amount: group._sum.amount || 0,
    count: group._count._all || 0,
  })),
});

export const ExpenseService = {
  createExpense: async (
    ownerId: number,
    shopId: number,
    userId: number,
    idempotencyKey: string,
    data: CreateExpenseDto,
  ) => {
    assertIdempotencyKey(idempotencyKey);
    await assertFeatureAccess(ownerId, shopId);

    return prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`
        SELECT id FROM "cash_registers"
        WHERE "shopId" = ${shopId} AND status = 'OPEN'
        FOR UPDATE
      `;

      const existing = await ExpenseRepository.findByIdempotencyKey(
        tx,
        shopId,
        idempotencyKey,
      );
      if (existing) return { expense: mapExpense(existing), idempotent: true };

      await CashService.assertOpen(shopId, tx);
      const cashTransaction = await CashService.recordOut(
        {
          shopId,
          amount: data.amount,
          label: `Dépense ${data.category}`,
          reference: data.reference,
          paymentMethod: data.paymentMethod,
        },
        tx,
      );

      if (!cashTransaction) throw new BadRequestError("Opération impossible");

      const expense = await ExpenseRepository.create(tx, {
        shopId,
        userId,
        cashTransactionId: cashTransaction.id,
        idempotencyKey,
        category: data.category,
        amount: data.amount,
        description: data.description,
        reference: data.reference,
        paymentMethod: data.paymentMethod,
      });

      return { expense: mapExpense(expense), idempotent: false };
    });
  },

  getExpenses: async (
    ownerId: number,
    shopId: number,
    query: ExpenseListQueryDto,
  ) => {
    await assertFeatureAccess(ownerId, shopId);
    const [total, expenses, aggregate, groups] = await Promise.all([
      ExpenseRepository.count(prisma, shopId, query),
      ExpenseRepository.findMany(prisma, shopId, query),
      ExpenseRepository.aggregate(prisma, shopId, query),
      ExpenseRepository.groupByCategory(prisma, shopId, query),
    ]);

    return {
      data: expenses.map(mapExpense),
      summary: buildSummary(aggregate, groups),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getExpenseById: async (ownerId: number, shopId: number, id: number) => {
    await assertFeatureAccess(ownerId, shopId);
    const expense = await ExpenseRepository.findById(prisma, shopId, id);
    if (!expense) throw new NotFoundError("Ressource introuvable");
    return mapExpense(expense);
  },

  getExpenseSummary: async (
    ownerId: number,
    shopId: number,
    query: Omit<ExpenseListQueryDto, "page" | "limit">,
  ) => {
    await assertFeatureAccess(ownerId, shopId);
    const [aggregate, groups] = await Promise.all([
      ExpenseRepository.aggregate(prisma, shopId, query),
      ExpenseRepository.groupByCategory(prisma, shopId, query),
    ]);
    return buildSummary(aggregate, groups);
  },
};
