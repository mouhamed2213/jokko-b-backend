import { CashService } from "../cash/cash.service.js";
import { SupplierRepository } from "../supplier/supplier.repository.js";
import type { RecordSupplierObligationDto } from "./procurement.dto.js";

export const ProcurementService = {
  recordSupplierObligation: async (
    input: RecordSupplierObligationDto,
    db: any,
  ) => {
    const debt = await SupplierRepository.createDebt(db, input.supplierId, {
      totalAmount: input.totalAmount,
      paidAmount: input.paidAmount,
      note:
        input.note ||
        (input.productName && input.quantity
          ? `Approvisionnement — ${input.productName} x${input.quantity}`
          : undefined),
      paymentMethod: input.paymentMethod,
    });

    if (input.receiptId) {
      await db.supplierDebt.update({ where: { id: debt.id }, data: { receiptId: input.receiptId } });
    }

    let payment = null;
    if (input.paidAmount > 0) {
      payment = await SupplierRepository.createPayment(db, debt.id, {
        amount: input.paidAmount,
        note: "Acompte fournisseur",
        paymentMethod: input.paymentMethod,
      });

      await CashService.recordOut(
        {
          shopId: input.shopId,
          amount: input.paidAmount,
          label:
            input.productName && input.quantity
              ? `Acompte fournisseur — ${input.productName} x${input.quantity}`
              : `Acompte fournisseur — ${input.supplierName}`,
          reference: String(input.supplierId),
          paymentMethod: input.paymentMethod,
        },
        db,
      );
    }

    return { debt, payment };
  },
};
