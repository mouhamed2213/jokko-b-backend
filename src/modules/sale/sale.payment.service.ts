import { prisma } from "../../config/prisma.js";
import { CashService } from "../cash/cash.service.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";
import type { SalePaymentDto } from "./sale.dto.js";
import { SaleRepository } from "./sale.repository.js";

export const SalePaymentService = {
  addPayment: async (shopId: number, saleId: number, data: SalePaymentDto) => {
    return prisma.$transaction(async (tx) => {
      const sale = await SaleRepository.findSaleByIdAndShop(saleId, shopId, tx);
      if (!sale) throw new NotFoundError("Ressource introuvable");
      if (sale.remaining <= 0) {
        throw new BadRequestError("Opération financière impossible");
      }
      if (data.amount > sale.remaining) {
        throw new BadRequestError("Opération financière impossible");
      }

      const paidAmount = sale.paidAmount + data.amount;
      const remaining = sale.remaining - data.amount;
      const status = remaining <= 0 ? "PAID" : "PARTIAL";

      await SaleRepository.createPayment(tx, saleId, data);
      const updatedSale = await SaleRepository.updateSalePaymentState(tx, saleId, {
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
    });
  },
};
