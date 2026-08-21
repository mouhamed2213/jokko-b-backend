import { PaymentService } from "../payment/payment.service.js";

export const SalePaymentService = {
  addPayment: PaymentService.addSalePayment,
};
