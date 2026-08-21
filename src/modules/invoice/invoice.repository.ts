import { SaleRepository } from "../sale/sale.repository.js";

export const InvoiceRepository = {
  findInvoices: SaleRepository.findInvoices,
  findInvoiceById: SaleRepository.findSaleByIdAndShop,
};
