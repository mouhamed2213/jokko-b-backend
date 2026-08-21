import { prisma } from "../../config/prisma.js";
import { CashService } from "../cash/cash.service.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";
import type { CreatePaymentOptions } from "../../types/index.js";
import type {
  PaymentInputDto,
  UpdateSubscriptionPaymentDto,
} from "./payment.dto.js";
import { PaymentRepository } from "./payment.repository.js";

export const PaymentService = {
  addSalePayment: async (
    shopId: number,
    saleId: number,
    data: PaymentInputDto,
  ) =>
    prisma.$transaction(async (tx) => {
      const sale = await PaymentRepository.findSaleByIdAndShop(
        saleId,
        shopId,
        tx,
      );
      if (!sale) throw new NotFoundError("Ressource introuvable");
      if (data.amount <= 0 || sale.remaining <= 0 || data.amount > sale.remaining) {
        throw new BadRequestError("Opération financière impossible");
      }

      const paidAmount = sale.paidAmount + data.amount;
      const remaining = sale.remaining - data.amount;
      const status = remaining <= 0 ? "PAID" : "PARTIAL";

      await PaymentRepository.createSalePayment(tx, saleId, data);
      const updatedSale = await PaymentRepository.updateSalePaymentState(tx, saleId, {
        paidAmount,
        remaining,
        status,
      });

      const clientLabel = updatedSale.client?.name || updatedSale.customerName || "Client";
      await CashService.recordIn(
        {
          shopId,
          amount: data.amount,
          label: `Règlement facture ${sale.invoiceNumber || `#${saleId}`} — ${clientLabel}`,
          reference: sale.invoiceNumber || String(saleId),
          paymentMethod: data.paymentMethod,
        },
        tx,
      );

      return updatedSale;
    }),

  addSupplierPayment: async (
    shopId: number,
    supplierId: number,
    debtId: number,
    data: PaymentInputDto,
  ) =>
    prisma.$transaction(async (tx) => {
      const supplier = await PaymentRepository.findSupplierByIdAndShop(
        tx,
        supplierId,
        shopId,
      );
      if (!supplier) throw new NotFoundError("Ressource introuvable");

      const debt = await PaymentRepository.findSupplierDebt(
        debtId,
        supplierId,
        tx,
      );
      if (!debt) throw new NotFoundError("Ressource introuvable");
      if (data.amount <= 0 || debt.status === "PAID" || data.amount > debt.remaining) {
        throw new BadRequestError("Opération financière impossible");
      }

      const payment = await PaymentRepository.createSupplierPayment(tx, debtId, data);
      const remaining = debt.remaining - data.amount;
      const updatedDebt = await PaymentRepository.updateSupplierDebt(tx, debtId, {
        paidAmount: debt.paidAmount + data.amount,
        remaining,
        status: remaining <= 0 ? "PAID" : "PARTIAL",
      });

      await CashService.recordOut(
        {
          shopId,
          amount: data.amount,
          label: `Paiement fournisseur — ${supplier.name}`,
          reference: String(supplierId),
          paymentMethod: data.paymentMethod,
        },
        tx,
      );

      return {
        payment,
        debtStatus: updatedDebt.status,
        remaining: updatedDebt.remaining,
      };
    }),

  createSubscriptionPayment: async (data: CreatePaymentOptions) =>
    PaymentRepository.createSubscriptionPayment(data),

  findSubscriptionPayment: async (paymentId: number) => {
    const payment = await PaymentRepository.findSubscriptionPayment(paymentId);
    if (!payment) throw new NotFoundError("Ressource introuvable");
    return payment;
  },

  updateSubscriptionPayment: async (
    paymentId: number,
    data: UpdateSubscriptionPaymentDto,
  ) => {
    await PaymentService.findSubscriptionPayment(paymentId);
    return PaymentRepository.updateSubscriptionPayment(paymentId, data);
  },
};
