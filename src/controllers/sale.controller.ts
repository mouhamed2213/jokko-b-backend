import { SaleController as DomainSaleController } from "../modules/sale/sale.controller.js";
import { getSaleStatus } from "../modules/sale/sale.service.js";

export { getSaleStatus };
export const getSales = DomainSaleController.getSales;
export const getSaleById = DomainSaleController.getSaleById;
export const getDigitalReceipt = DomainSaleController.getDigitalReceipt;

export const createSale = DomainSaleController.createSale;
export const updateSale = DomainSaleController.updateSale;
export const addSalePayment = DomainSaleController.addSalePayment;
export const deleteSale = DomainSaleController.deleteSale;
