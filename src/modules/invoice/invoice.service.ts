import { NotFoundError } from "../../utils/errors.js";
import type { InvoiceListQueryDto, SalePaymentDto } from "./invoice.dto.js";
import { InvoiceRepository } from "./invoice.repository.js";
import { SalePaymentService } from "../sale/sale.payment.service.js";

export const InvoiceService = {
  getInvoices: async (shopId: number, query: InvoiceListQueryDto) => {
    const result = await InvoiceRepository.findInvoices(shopId, query);
    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
      stats: {
        totalInvoices: result.stats._count,
        totalRevenue: result.stats._sum.totalAmount || 0,
        totalCollected: result.stats._sum.paidAmount || 0,
        totalOutstanding: result.stats._sum.remaining || 0,
      },
    };
  },

  getInvoiceById: async (shopId: number, invoiceId: number) => {
    const invoice = await InvoiceRepository.findInvoiceById(invoiceId, shopId);
    if (!invoice) throw new NotFoundError("Ressource introuvable");
    return invoice;
  },

  addPayment: async (shopId: number, invoiceId: number, data: SalePaymentDto) =>
    SalePaymentService.addPayment(shopId, invoiceId, data),
};
