import { CashController as DomainCashController } from "../modules/cash/cash.controller.js";

export const openCash = DomainCashController.openCash;
export const closeCash = DomainCashController.closeCash;
export const getCurrentCash = DomainCashController.getCurrentCash;
export const getCashHistory = DomainCashController.getCashHistory;
export const getCashById = DomainCashController.getCashById;
export const addTransaction = DomainCashController.addTransaction;
export const getReconciliation = DomainCashController.getReconciliation;
export const reconcileCash = DomainCashController.reconcileCash;
