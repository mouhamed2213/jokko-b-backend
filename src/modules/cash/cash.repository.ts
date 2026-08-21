import { prisma } from "../../config/prisma.js";

// Le type est volontairement structurel pour accepter PrismaClient et un client de transaction.
type DatabaseClient = any;

export const CashRepository = {
  findOpenRegister: async (shopId: number, db: DatabaseClient = prisma) => {
    return db.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
    });
  },

  createOutTransaction: async (
    db: DatabaseClient,
    input: {
      cashRegisterId: number;
      amount: number;
      label: string;
      reference?: string | null;
      paymentMethod?: string;
    },
  ) => {
    const transaction = await db.cashTransaction.create({
      data: {
        cashRegisterId: input.cashRegisterId,
        type: "OUT",
        amount: input.amount,
        label: input.label,
        reference: input.reference ?? null,
        paymentMethod: input.paymentMethod ?? "CASH",
      },
    });

    await db.cashRegister.update({
      where: { id: input.cashRegisterId },
      data: { totalOut: { increment: input.amount } },
    });

    return transaction;
  },
};
