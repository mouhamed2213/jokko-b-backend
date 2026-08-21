import { StockController as DomainStockController } from "../modules/stock/stock.controller.js";

export const addStockEntry = DomainStockController.addStockEntry;
export const addStockOut = DomainStockController.addStockOut;
export const getStockMovements = DomainStockController.getStockMovements;
