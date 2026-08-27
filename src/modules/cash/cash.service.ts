import { prisma } from "../../config/prisma.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../utils/errors.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import type {
  CashHistoryQueryDto,
  CashRecordInput,
  CashRecordOptions,
  CloseCashDto,
  CreateCashTransactionDto,
  OpenCashDto,
  ReconcileCashDto,
} from "./cash.dto.js";
import { CashRepository } from "./cash.repository.js";

const methodLabels: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  FREE_MONEY: "Free Money",
  BANK: "Virement bancaire",
  OTHER: "Autre",
};

const assertAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("Opération financière invalide");
  }
};

const getSummary = (register: any, fallbackClosedAt?: Date | null) => {
  const byMethod: Record<string, { in: number; out: number }> = {};
  for (const transaction of register.transactions) {
    const method = transaction.paymentMethod || "CASH";
    if (!byMethod[method]) byMethod[method] = { in: 0, out: 0 };
    if (transaction.type === "IN") byMethod[method].in += transaction.amount;
    else byMethod[method].out += transaction.amount;
  }

  const paymentMethodSummary = Object.entries(byMethod).map(([method, amounts]) => ({
    method,
    label: methodLabels[method] || method,
    totalIn: amounts.in,
    totalOut: amounts.out,
    net: amounts.in - amounts.out,
  }));

  const closingAmount =
    register.closingAmount ?? register.openingAmount + register.totalIn - register.totalOut;

  return {
    date: new Date().toLocaleDateString("fr-FR"),
    openedAt: register.openedAt,
    closedAt: register.closedAt ?? fallbackClosedAt ?? null,
    openingAmount: register.openingAmount,
    totalIn: register.totalIn,
    totalOut: register.totalOut,
    closingAmount,
    transactionCount: register.transactions.length,
    openedBy: register.user?.name || "Inconnu",
    paymentMethodSummary,
  };
};

const record = async (
  input: CashRecordInput,
  type: "IN" | "OUT",
  db: any,
  options: CashRecordOptions = {},
) => {
  assertAmount(input.amount);
  const register = await CashRepository.findOpenRegister(input.shopId, db);
  if (!register) {
    if (options.required === false) return null;
    throw new BadRequestError("Opération impossible");
  }

  return CashRepository.createTransaction(db, {
    cashRegisterId: register.id,
    type,
    amount: input.amount,
    label: input.label,
    reference: input.reference,
    paymentMethod: input.paymentMethod,
  });
};

export const CashService = {
  assertOpen: async (shopId: number, db: any = prisma) => {
    const register = await CashRepository.findOpenRegister(shopId, db);
    if (!register) throw new BadRequestError("Opération impossible");
    return register;
  },

  recordIn: async (
    input: CashRecordInput,
    db: any = prisma,
    options: CashRecordOptions = {},
  ) => record(input, "IN", db, options),

  recordOut: async (
    input: CashRecordInput,
    db: any = prisma,
    options: CashRecordOptions = {},
  ) => record(input, "OUT", db, options),

  openCash: async (shopId: number, userId: number, data: OpenCashDto) => {
    return prisma.$transaction(async (tx) => {
      const existing = await CashRepository.findOpenRegister(shopId, tx);
      if (existing) throw new BadRequestError("Opération impossible");
      return CashRepository.createRegister(tx, {
        shopId,
        userId,
        openingAmount: data.openingAmount,
        note: data.note,
      });
    });
  },

  closeCash: async (shopId: number, registerId: number, data: CloseCashDto) => {
    return prisma.$transaction(async (tx) => {
      const register = await CashRepository.findOpenRegisterByIdAndShop(
        registerId,
        shopId,
        tx,
      );
      if (!register) throw new NotFoundError("Ressource introuvable");

      const closingAmount = register.openingAmount + register.totalIn - register.totalOut;
      const closed = await CashRepository.closeRegister(
        tx,
        registerId,
        closingAmount,
        data.note,
      );
      return { cashRegister: closed, summary: getSummary(closed) };
    });
  },

  getCurrentCash: async (shopId: number) => {
    const register = await CashRepository.findOpenRegisterWithTransactions(shopId);
    if (!register) return { open: false, cashRegister: null };

    const currentBalance = register.openingAmount + register.totalIn - register.totalOut;
    return {
      open: true,
      cashRegister: { ...register, currentBalance },
    };
  },

  getCashHistory: async (shopId: number, query: CashHistoryQueryDto) => {
    const [total, registers] = await Promise.all([
      CashRepository.countRegisters(shopId),
      CashRepository.findRegisters(shopId, query.page, query.limit),
    ]);

    const data = registers.map((register: any) => ({
      ...register,
      currentBalance:
        register.closingAmount ?? register.openingAmount + register.totalIn - register.totalOut,
      transactionCount: register.transactions.length,
      salesIncome: register.transactions
        .filter((transaction: any) =>
          transaction.type === "IN" && transaction.label.startsWith("Vente"),
        )
        .reduce((sum: number, transaction: any) => sum + transaction.amount, 0),
      supplierPayments: register.transactions
        .filter((transaction: any) =>
          transaction.type === "OUT" && transaction.label.toLowerCase().includes("fournisseur"),
        )
        .reduce((sum: number, transaction: any) => sum + transaction.amount, 0),
    }));

    return {
      data,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getCashById: async (shopId: number, registerId: number) => {
    const register = await CashRepository.findRegisterByIdAndShop(registerId, shopId);
    if (!register) throw new NotFoundError("Ressource introuvable");

    const currentBalance =
      register.closingAmount ?? register.openingAmount + register.totalIn - register.totalOut;
    return { ...register, currentBalance };
  },

  getReconciliation: async (ownerId: number, shopId: number, registerId: number) => {
    const ownership = await prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerId, shopId } },
      select: { id: true },
    });
    if (!ownership) throw new UnauthorizedError("Accès non autorisé");

    const subscription = await PlanChecker.plan(shopId, ownership.id);
    if (
      ["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) ||
      !subscription.features.includes("CASH_CONTROL" as never)
    ) {
      throw new ForbiddenError("Opération non autorisée");
    }

    const register = await CashRepository.findRegisterByIdAndShop(registerId, shopId);
    if (!register) throw new NotFoundError("Ressource introuvable");
    const reconciliation = await CashRepository.findReconciliationByRegisterIdAndShop(
      prisma,
      registerId,
      shopId,
    );
    return reconciliation;
  },

  reconcileCash: async (
    ownerId: number,
    shopId: number,
    userId: number,
    registerId: number,
    data: ReconcileCashDto,
  ) => {
    const ownership = await prisma.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerId, shopId } },
      select: { id: true },
    });
    if (!ownership) throw new UnauthorizedError("Accès non autorisé");

    const subscription = await PlanChecker.plan(shopId, ownership.id);
    if (
      ["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) ||
      !subscription.features.includes("CASH_CONTROL" as never)
    ) {
      throw new ForbiddenError("Opération non autorisée");
    }

    return prisma.$transaction(async (tx: any) => {
      const register = await CashRepository.findOpenRegisterByIdAndShop(
        registerId,
        shopId,
        tx,
      );
      if (!register) throw new BadRequestError("Opération impossible");

      const existing = await CashRepository.findReconciliationByRegisterIdAndShop(
        tx,
        registerId,
        shopId,
      );
      if (existing) throw new BadRequestError("Opération impossible");

      const expectedAmount = register.openingAmount + register.totalIn - register.totalOut;
      const difference = data.countedAmount - expectedAmount;
      const status = difference === 0
        ? "BALANCED"
        : difference < 0
          ? "SHORTAGE"
          : "SURPLUS";

      const reconciliation = await CashRepository.createReconciliation(tx, {
        shopId,
        cashRegisterId: registerId,
        userId,
        expectedAmount,
        countedAmount: data.countedAmount,
        difference,
        status,
        note: data.note,
      });
      const cashRegister = await CashRepository.closeRegister(
        tx,
        registerId,
        data.countedAmount,
        data.note,
      );

      return { reconciliation, cashRegister };
    });
  },

  addTransaction: async (
    shopId: number,
    data: CreateCashTransactionDto,
  ) => {
    return prisma.$transaction(async (tx) => {
      return CashService[`record${data.type === "IN" ? "In" : "Out"}` as "recordIn" | "recordOut"](
        {
          shopId,
          amount: data.amount,
          label: data.label,
          reference: data.reference,
          paymentMethod: data.paymentMethod,
        },
        tx,
      );
    });
  },
};
