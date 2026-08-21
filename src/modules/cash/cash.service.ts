import { BadRequestError } from "../../utils/errors.js";
import { CashRepository } from "./cash.repository.js";

type CashDatabaseClient = any;

export type CashOutInput = {
  shopId: number;
  amount: number;
  label: string;
  reference?: string | null;
  paymentMethod?: string;
};

export const CashService = {
  recordOut: async (
    input: CashOutInput,
    db?: CashDatabaseClient,
  ) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestError("Opération financière invalide");
    }

    const register = await CashRepository.findOpenRegister(input.shopId, db);
    if (!register) {
      throw new BadRequestError("Opération impossible");
    }

    return CashRepository.createOutTransaction(db, {
      cashRegisterId: register.id,
      amount: input.amount,
      label: input.label,
      reference: input.reference,
      paymentMethod: input.paymentMethod,
    });
  },
};
