import { SupplierController as DomainSupplierController } from "../modules/supplier/supplier.controller.js";

export const getSuppliers = DomainSupplierController.getSuppliers;
export const getSupplierById = DomainSupplierController.getSupplierById;
export const createSupplier = DomainSupplierController.createSupplier;
export const updateSupplier = DomainSupplierController.updateSupplier;
export const deleteSupplier = DomainSupplierController.deleteSupplier;
export const addSupplierDebt = DomainSupplierController.addSupplierDebt;
export const addSupplierPayment = DomainSupplierController.addSupplierPayment;
