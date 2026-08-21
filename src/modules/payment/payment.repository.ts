import { prisma } from "../../config/prisma.js";
import type { CreatePaymentOptions } from "../../types/index.js";
import type {
  SalePaymentDto,
  SupplierPaymentDto,
  UpdateSubscriptionPaymentDto,
} from "./payment.dto.js";
import { SaleRepository } from "../sale/sale.repository.js";
import { SupplierRepository } from "../supplier/supplier.repository.js";

type DatabaseClient = any;

export const PaymentRepository = {
  findSaleByIdAndShop: SaleRepository.findSaleByIdAndShop,

  createSalePayment: async (
    db: DatabaseClient,
    saleId: number,
    data: SalePaymentDto,
  ) => SaleRepository.createPayment(db, saleId, data),

  updateSalePaymentState: SaleRepository.updateSalePaymentState,

  findSupplierByIdAndShop: async (
    db: DatabaseClient,
    supplierId: number,
    shopId: number,
  ) =>
    db.supplier.findFirst({
      where: { id: supplierId, shopId },
      select: { id: true, name: true },
    }),

  findSupplierDebt: SupplierRepository.findDebtByIdAndSupplier,

  createSupplierPayment: async (
    db: DatabaseClient,
    debtId: number,
    data: SupplierPaymentDto,
  ) => SupplierRepository.createPayment(db, debtId, data),

  updateSupplierDebt: SupplierRepository.updateDebt,

  createSubscriptionPayment: async (data: CreatePaymentOptions) =>
    prisma.payment.create({ data }),

  findSubscriptionPayment: async (paymentId: number) =>
    prisma.payment.findUnique({ where: { id: paymentId } }),

  updateSubscriptionPayment: async (
    paymentId: number,
    data: UpdateSubscriptionPaymentDto,
  ) => prisma.payment.update({ where: { id: paymentId }, data }),
};
