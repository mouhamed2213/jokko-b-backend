import { InvoiceController as DomainInvoiceController } from "../modules/invoice/invoice.controller.js";

export const getInvoices = DomainInvoiceController.getInvoices;
export const getInvoiceById = DomainInvoiceController.getInvoiceById;
export const addInvoicePayment = DomainInvoiceController.addInvoicePayment;
