import type { PaymentStatus } from "../database/prisma/generated/prisma/enums.js";
import type { CreatePaymentOptions } from "../types/index.js";
import { PaymentService as DomainPaymentService } from "../modules/payment/payment.service.js";

export const PaymentService = {
  createPayment: (paymentOptions: CreatePaymentOptions) =>
    DomainPaymentService.createSubscriptionPayment(paymentOptions),

  findPayment: (paymentId: number) =>
    DomainPaymentService.findSubscriptionPayment(paymentId),

  updatePayment: async (paymentId: number, status: PaymentStatus) => {
    const payment = await DomainPaymentService.updateSubscriptionPayment(
      paymentId,
      { status },
    );
    return { update: payment.status, updateDate: payment.updatedAt };
  },
};
