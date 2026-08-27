import { prisma } from "../../config/prisma.js";
import { CashService } from "../cash/cash.service.js";
import { NotificationService } from "../notification/notification.service.js";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import type {
  CreateSaleDto,
  SaleListQueryDto,
  UpdateSaleDto,
} from "./sale.dto.js";
import { SalePaymentService } from "./sale.payment.service.js";
import { SaleRepository } from "./sale.repository.js";
import { StockRepository } from "../stock/stock.repository.js";

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

  getDigitalReceipt: async (shopId: number, saleId: number) => {
    const sale = await SaleRepository.findSaleByIdAndShop(saleId, shopId);
    if (!sale) throw new NotFoundError("Ressource introuvable");

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      client: sale.client,
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
      remaining: sale.remaining,
      status: sale.status,
      note: sale.note,
      createdAt: sale.createdAt,
      items: sale.items,
      payments: sale.payments,
      returns: sale.returns,
    };
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
      const costedItems: Array<CreateSaleDto["items"][number] & { unitCost: number; costTotal: number; marginAmount: number }> = [];
      for (const item of data.items) {
        const cost = await StockRepository.decrementWithAverageCost(
          tx,
          item.productId,
          shopId,
          item.quantity,
        );
        if (cost.count !== 1 || cost.unitCost === null) {
          throw new BadRequestError("Stock insuffisant");
        }
        const costTotal = cost.unitCost * item.quantity;
        costedItems.push({
          ...item,
          unitCost: cost.unitCost,
          costTotal,
          marginAmount: item.unitPrice * item.quantity - costTotal,
        });
      }

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
        items: costedItems,
        products,
      });

      if (paidAmount > 0) {
        await SaleRepository.createPayment(tx, sale.id, {
          amount: paidAmount,
          note: "Paiement initial",
          paymentMethod: data.paymentMethod,
        });
      }

      for (const item of costedItems) {
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: item.productId,
          userId,
          type: "SALE",
          quantity: item.quantity,
          unitCost: item.unitCost,
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
      NotificationService.sendToShop(shopId, "stock_alert", {
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
    expectedUpdatedAt?: string,
  ) => {
    const existingSale = await SaleRepository.findSaleByIdAndShop(saleId, shopId);
    if (!existingSale) throw new NotFoundError("Ressource introuvable");
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(existingSale.updatedAt).getTime()) {
      throw new ConflictError("La vente a été modifiée depuis sa mise en cache",);
    }
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
      for (const existingItem of existingSale.items as any[]) {
        if (!existingItem.productId) continue;
        const restored = existingItem.unitCost === null || existingItem.unitCost === undefined
          ? await SaleRepository.updateProductQuantity(tx, existingItem.productId, shopId, existingItem.quantity)
          : await StockRepository.restoreWithAverageCost(tx, existingItem.productId, shopId, existingItem.quantity, existingItem.unitCost);
        if (restored.count !== 1) throw new BadRequestError("Opération impossible");
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: existingItem.productId,
          userId,
          type: "ENTRY",
          quantity: existingItem.quantity,
          unitCost: existingItem.unitCost ?? null,
          note: `Modification facture ${existingSale.invoiceNumber || `#${saleId}`}`,
        });
      }

      const costedItems: Array<UpdateSaleDto["items"][number] & { unitCost: number; costTotal: number; marginAmount: number }> = [];
      for (const item of data.items) {
        const cost = await StockRepository.decrementWithAverageCost(tx, item.productId, shopId, item.quantity);
        if (cost.count !== 1 || cost.unitCost === null) throw new BadRequestError("Stock insuffisant");
        const costTotal = cost.unitCost * item.quantity;
        costedItems.push({
          ...item,
          unitCost: cost.unitCost,
          costTotal,
          marginAmount: item.unitPrice * item.quantity - costTotal,
        });
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: item.productId,
          userId,
          type: "SALE",
          quantity: item.quantity,
          unitCost: cost.unitCost,
          note: `Modification facture ${existingSale.invoiceNumber || `#${saleId}`}`,
        });
      }

      return SaleRepository.updateSale(tx, saleId, {
        clientId: data.clientId,
        customerName: data.customerName,
        totalAmount,
        note: data.note,
        items: costedItems,
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
        const restored = item.unitCost === null || item.unitCost === undefined
          ? await SaleRepository.updateProductQuantity(tx, item.productId, shopId, item.quantity)
          : await StockRepository.restoreWithAverageCost(tx, item.productId, shopId, item.quantity, item.unitCost);
        if (restored.count !== 1) throw new BadRequestError("Opération impossible");
        await SaleRepository.createStockMovement(tx, {
          shopId,
          productId: item.productId,
          userId,
          type: "ENTRY",
          quantity: item.quantity,
          unitCost: item.unitCost ?? null,
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
