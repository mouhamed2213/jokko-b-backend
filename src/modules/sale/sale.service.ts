import { prisma } from "../../config/prisma.js";
import { CashService } from "../cash/cash.service.js";
import { sendNotificationToShop } from "../../controllers/notification.controller.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import type {
  CreateSaleDto,
  SaleListQueryDto,
  UpdateSaleDto,
} from "./sale.dto.js";
import { SalePaymentService } from "./sale.payment.service.js";
import { SaleRepository } from "./sale.repository.js";

export const getSaleStatus = (paid: number, total: number) => {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
};

const assertItemsStock = (
  items: CreateSaleDto["items"],
  products: Array<{ id: number; name: string; quantity: number }>,
) => {
  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) throw new NotFoundError("Ressource introuvable");
    if (product.quantity < item.quantity) {
      throw new BadRequestError("Stock insuffisant");
    }
  }
};

const totalOf = (items: Array<{ quantity: number; unitPrice: number }>) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

export const SaleService = {
  getSales: async (shopId: number, query: SaleListQueryDto) => {
    const [result, salescount] = await Promise.all([
      SaleRepository.findSales(shopId, query),
      SaleRepository.countAllByShop(shopId),
    ]);

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
      meta: { salescount },
    };
  },

  getSaleById: async (shopId: number, saleId: number) => {
    const sale = await SaleRepository.findSaleByIdAndShop(saleId, shopId);
    if (!sale) throw new NotFoundError("Ressource introuvable");
    return sale;
  },

  createSale: async (
    ownerId: number,
    shopId: number,
    userId: number,
    data: CreateSaleDto,
  ) => {
    const ownership = await SaleRepository.findOwnership(ownerId, shopId);
    if (!ownership) throw new UnauthorizedError("Accès non autorisé");

    const subscription = await PlanChecker.plan(shopId, ownership.id);
    if (!subscription) throw new ForbiddenError("Opération non autorisée");

    if (subscription.limits.sales) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const currentSales = await SaleRepository.countByMonth(shopId, startOfMonth);
      if (currentSales >= subscription.limits.sales) {
        throw new ForbiddenError("Opération non autorisée");
      }
    }

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await SaleRepository.findProductsByIdsAndShop(productIds, shopId);
    assertItemsStock(data.items, products);

    if (data.clientId) {
      const client = await SaleRepository.findClientByIdAndShop(data.clientId, shopId);
      if (!client) throw new NotFoundError("Ressource introuvable");
    }

    const totalAmount = totalOf(data.items);
    const paidAmount = data.paidAmount === undefined ? totalAmount : data.paidAmount;
    if (paidAmount > totalAmount) throw new BadRequestError("Montant payé invalide");

    const result = await prisma.$transaction(async (tx) => {
      await CashService.assertOpen(shopId, tx);

      const invoiceNumber = await SaleRepository.generateInvoiceNumber(tx, shopId);
      const remaining = totalAmount - paidAmount;
      const status = getSaleStatus(paidAmount, totalAmount);
      const sale = await SaleRepository.createSale(tx, {
        shopId,
        userId,
        clientId: data.clientId,
        customerName: data.customerName,
        invoiceNumber,
        totalAmount,
        paidAmount,
        remaining,
        status,
        note: data.note,
        items: data.items,
        products,
      });

      if (paidAmount > 0) {
        await SaleRepository.createPayment(tx, sale.id, {
          amount: paidAmount,
          note: "Paiement initial",
          paymentMethod: data.paymentMethod,
        });
      }

      for (const item of data.items) {
        const updated = await SaleRepository.updateProductQuantity(
          tx,
          item.productId,
          shopId,
          -item.quantity,
        );
        if (updated.count !== 1) throw new BadRequestError("Stock insuffisant");
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: item.productId,
          userId,
          type: "SALE",
          quantity: item.quantity,
          note: `Vente ${invoiceNumber}`,
        });
      }

      if (paidAmount > 0) {
        const clientLabel = data.customerName || "Client";
        await CashService.recordIn(
          {
            shopId,
            amount: paidAmount,
            label: `Vente ${invoiceNumber} — ${clientLabel}`,
            reference: invoiceNumber,
            paymentMethod: data.paymentMethod,
          },
          tx,
        );
      }

      const updatedProducts = await SaleRepository.findProductsForAlerts(
        tx,
        productIds,
        shopId,
      );
      const lowStock = updatedProducts.filter(
        (product: any) => product.quantity > 0 && product.quantity <= product.alertThreshold,
      );
      const outOfStock = updatedProducts.filter((product: any) => product.quantity === 0);

      const finalSale = await SaleRepository.findSaleByIdAndShop(sale.id, shopId, tx);
      if (!finalSale) throw new NotFoundError("Ressource introuvable");
      return {
        sale: finalSale,
        invoiceNumber,
        lowStock,
        outOfStock,
        alertsEnabled: subscription.plan.code !== "FREE",
      };
    });

    if (result.alertsEnabled && (result.lowStock.length > 0 || result.outOfStock.length > 0)) {
      sendNotificationToShop(shopId, "stock_alert", {
        type: "after_sale",
        invoiceNumber: result.invoiceNumber,
        lowStock: result.lowStock,
        outOfStock: result.outOfStock,
        total: result.lowStock.length + result.outOfStock.length,
      });
    }

    return result.sale;
  },

  updateSale: async (
    shopId: number,
    userId: number,
    saleId: number,
    data: UpdateSaleDto,
  ) => {
    const existingSale = await SaleRepository.findSaleByIdAndShop(saleId, shopId);
    if (!existingSale) throw new NotFoundError("Ressource introuvable");
    if (existingSale.paidAmount > 0) {
      throw new ForbiddenError("Opération non autorisée");
    }

    const productIds = [...new Set([
      ...existingSale.items.filter((item: any) => item.productId).map((item: any) => item.productId),
      ...data.items.map((item) => item.productId),
    ])];
    const products = await SaleRepository.findProductsByIdsAndShop(productIds, shopId);
    assertItemsStock(data.items, products);

    const previous = new Map<number, number>();
    for (const item of existingSale.items as any[]) {
      if (item.productId) previous.set(item.productId, (previous.get(item.productId) || 0) + item.quantity);
    }
    const requested = new Map<number, number>();
    for (const item of data.items) {
      requested.set(item.productId, (requested.get(item.productId) || 0) + item.quantity);
    }

    for (const [productId, quantity] of requested.entries()) {
      const product = products.find((entry) => entry.id === productId)!;
      const available = product.quantity + (previous.get(productId) || 0);
      if (quantity > available) throw new BadRequestError("Stock insuffisant");
    }

    const totalAmount = totalOf(data.items);
    return prisma.$transaction(async (tx) => {
      for (const [productId, quantity] of previous.entries()) {
        await SaleRepository.updateProductQuantity(tx, productId, shopId, quantity);
      }
      for (const [productId, quantity] of requested.entries()) {
        const updated = await SaleRepository.updateProductQuantity(tx, productId, shopId, -quantity);
        if (updated.count !== 1) throw new BadRequestError("Stock insuffisant");
      }

      const allProductIds = new Set([...previous.keys(), ...requested.keys()]);
      for (const productId of allProductIds) {
        const before = previous.get(productId) || 0;
        const after = requested.get(productId) || 0;
        const delta = after - before;
        if (delta !== 0) {
          await SaleRepository.createStockMovement(tx, {
            shopId,
            productId,
            userId,
            type: delta > 0 ? "SALE" : "ENTRY",
            quantity: Math.abs(delta),
            note: `Modification facture ${existingSale.invoiceNumber || `#${saleId}`}`,
          });
        }
      }

      return SaleRepository.updateSale(tx, saleId, {
        clientId: data.clientId,
        customerName: data.customerName,
        totalAmount,
        note: data.note,
        items: data.items,
        products,
      });
    });
  },

  addPayment: async (shopId: number, saleId: number, data: import("./sale.dto.js").SalePaymentDto) =>
    SalePaymentService.addPayment(shopId, saleId, data),

  deleteSale: async (shopId: number, userId: number, saleId: number) => {
    const sale = await SaleRepository.findSaleByIdAndShop(saleId, shopId);
    if (!sale) throw new NotFoundError("Ressource introuvable");

    return prisma.$transaction(async (tx) => {
      for (const item of sale.items as any[]) {
        if (!item.productId) continue;
        await SaleRepository.updateProductQuantity(tx, item.productId, shopId, item.quantity);
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: item.productId,
          userId,
          type: "ENTRY",
          quantity: item.quantity,
          note: `Annulation vente ${sale.invoiceNumber}`,
        });
      }

      if (sale.paidAmount > 0) {
        await CashService.recordOut(
          {
            shopId,
            amount: sale.paidAmount,
            label: `Annulation vente ${sale.invoiceNumber}`,
            reference: sale.invoiceNumber || String(saleId),
          },
          tx,
        );
      }

      await SaleRepository.deleteSale(tx, saleId);
      return sale;
    });
  },
};
