import { prisma } from "../../config/prisma.js";
import { CashService } from "../cash/cash.service.js";
import { ProcurementService } from "../procurement/procurement.service.js";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import type {
  CreateSupplierDebtDto,
  CreateSupplierDto,
  CreateSupplierPaymentDto,
  UpdateSupplierDto,
} from "./supplier.dto.js";
import { SupplierRepository } from "./supplier.repository.js";

const assertOwner = async (ownerId: number, shopId: number) => {
  const ownership = await SupplierRepository.findOwnership(ownerId, shopId);
  if (!ownership) throw new UnauthorizedError("Accès non autorisé");
  return ownership;
};

const summarizeSupplier = <T extends {
  supplierDebts: Array<{
    status: string;
    remaining: number;
    paidAmount: number;
    totalAmount: number;
  }>;
  _count: { stockMovements: number };
}>(supplier: T) => ({
  ...supplier,
  totalDebt: supplier.supplierDebts
    .filter((debt) => debt.status !== "PAID")
    .reduce((sum, debt) => sum + debt.remaining, 0),
  totalPaid: supplier.supplierDebts.reduce(
    (sum, debt) => sum + debt.paidAmount,
    0,
  ),
  totalPurchases: supplier.supplierDebts.reduce(
    (sum, debt) => sum + debt.totalAmount,
    0,
  ),
  deliveries: supplier._count.stockMovements,
});

const assertSupplier = async (supplierId: number, shopId: number) => {
  const supplier = await SupplierRepository.findByIdAndShop(supplierId, shopId);
  if (!supplier) throw new NotFoundError("Ressource introuvable");
  return supplier;
};

export const SupplierService = {
  getSuppliers: async (shopId: number) => {
    const suppliers = await SupplierRepository.findManyByShop(shopId);
    return suppliers.map(summarizeSupplier);
  },

  getSupplierById: async (shopId: number, supplierId: number) => {
    const supplier = await assertSupplier(supplierId, shopId);
    return {
      ...supplier,
      totalDebt: supplier.supplierDebts
        .filter((debt) => debt.status !== "PAID")
        .reduce((sum, debt) => sum + debt.remaining, 0),
      totalPaid: supplier.supplierDebts.reduce(
        (sum, debt) => sum + debt.paidAmount,
        0,
      ),
      totalPurchases: supplier.supplierDebts.reduce(
        (sum, debt) => sum + debt.totalAmount,
        0,
      ),
    };
  },

  createSupplier: async (
    ownerId: number,
    shopId: number,
    data: CreateSupplierDto,
  ) => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await PlanChecker.plan(shopId, ownership.id);
    const planCode = subscription.plan.code;

    if (planCode === "FREE" || planCode === "BASIC") {
      throw new ForbiddenError("Opération non autorisée");
    }

    return SupplierRepository.create(shopId, data);
  },

  updateSupplier: async (
    shopId: number,
    supplierId: number,
    data: UpdateSupplierDto,
  ) => {
    await assertSupplier(supplierId, shopId);
    return SupplierRepository.update(supplierId, data);
  },

  deleteSupplier: async (shopId: number, supplierId: number) => {
    await assertSupplier(supplierId, shopId);
    await SupplierRepository.delete(supplierId);
  },

  addSupplierDebt: async (
    shopId: number,
    supplierId: number,
    data: CreateSupplierDebtDto,
  ) => {
    const supplier = await assertSupplier(supplierId, shopId);

    return prisma.$transaction(async (tx) =>
      ProcurementService.recordSupplierObligation(
        {
          shopId,
          supplierId,
          supplierName: supplier.name,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          note: data.note,
          paymentMethod: data.paymentMethod,
        },
        tx,
      ),
    );
  },

  addSupplierPayment: async (
    shopId: number,
    supplierId: number,
    debtId: number,
    data: CreateSupplierPaymentDto,
  ) => {
    const supplier = await assertSupplier(supplierId, shopId);
    const debt = await SupplierRepository.findDebtByIdAndSupplier(
      debtId,
      supplierId,
    );

    if (!debt) throw new NotFoundError("Ressource introuvable");
    if (debt.status === "PAID" || data.amount > debt.remaining) {
      throw new AppError("Opération financière impossible", 400);
    }

    return prisma.$transaction(async (tx) => {
      const payment = await SupplierRepository.createPayment(tx, debtId, data);
      const remaining = debt.remaining - data.amount;
      const updatedDebt = await SupplierRepository.updateDebt(tx, debtId, {
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
    });
  },
};
