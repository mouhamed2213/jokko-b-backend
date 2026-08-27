import { prisma } from "../../config/prisma.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { CashService } from "../cash/cash.service.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import { SaleReturnRepository } from "./sale-return.repository.js";
import { StockRepository } from "../stock/stock.repository.js";

import type { CreateSaleReturnDto } from "./sale-return.dto.js";

export const SaleReturnService = {
  getReturns: async (shopId: number, saleId: number) => {
    const sale = await SaleReturnRepository.findSaleByIdAndShop(prisma, saleId, shopId);
    if (!sale) throw new NotFoundError("Ressource introuvable");

    const returns = await SaleReturnRepository.findBySaleId(prisma, saleId, shopId);
    return {
      saleId,
      returns,
      totals: {
        refundAmount: returns.reduce((sum: number, item: any) => sum + item.refundAmount, 0),
        itemCount: returns.reduce(
          (sum: number, item: any) => sum + item.items.length,
          0,
        ),
      },
    };
  },

  createReturn: async (
    ownerId: number,
    shopId: number,
    userId: number,
    saleId: number,
    idempotencyKey: string,
    data: CreateSaleReturnDto,
  ) => {
    if (!idempotencyKey || idempotencyKey.length > 120) {
      throw new BadRequestError("Requête invalide");
    }

    const ownership = await SaleReturnRepository.findOwnership(prisma, ownerId, shopId);
    if (!ownership) throw new UnauthorizedError("Accès non autorisé");

    const subscription = await PlanChecker.plan(shopId, ownership.id);
    if (["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status)) {
      throw new ForbiddenError("Opération non autorisée");
    }

    return prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`
        SELECT id FROM "sales"
        WHERE id = ${saleId} AND "shopId" = ${shopId}
        FOR UPDATE
      `;

      const existing = await SaleReturnRepository.findByIdempotencyKey(
        tx,
        shopId,
        saleId,
        idempotencyKey,
      );
      if (existing) {
        return {
          saleReturn: existing,
          sale: await SaleReturnRepository.findSaleByIdAndShop(tx, saleId, shopId),
          idempotent: true,
        };
      }

      const sale = await SaleReturnRepository.findSaleByIdAndShop(tx, saleId, shopId);
      if (!sale) throw new NotFoundError("Ressource introuvable");

      const previousReturns = await SaleReturnRepository.findBySaleId(tx, saleId, shopId);
      const returnedBySaleItem = new Map<number, number>();
      let previousRefundAmount = 0;
      for (const saleReturn of previousReturns as any[]) {
        previousRefundAmount += saleReturn.refundAmount;
        for (const item of saleReturn.items) {
          returnedBySaleItem.set(
            item.saleItemId,
            (returnedBySaleItem.get(item.saleItemId) || 0) + item.quantity,
          );
        }
      }

      const saleItems = new Map<number, any>(
        (sale.items as any[]).map((item) => [item.id, item]),
      );
      const returnItems = data.items.map((requestedItem) => {
        const saleItem = saleItems.get(requestedItem.saleItemId);
        if (!saleItem || !saleItem.productId) {
          throw new BadRequestError("Article de vente invalide");
        }

        const alreadyReturned = returnedBySaleItem.get(saleItem.id) || 0;
        if (alreadyReturned + requestedItem.quantity > saleItem.quantity) {
          throw new BadRequestError("Quantité de retour invalide");
        }

        const totalAmount = requestedItem.quantity * saleItem.unitPrice;
        return {
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          productName: saleItem.productName,
          quantity: requestedItem.quantity,
                    unitPrice: saleItem.unitPrice,
          costAmount: saleItem.unitCost === null || saleItem.unitCost === undefined ? null : saleItem.unitCost * requestedItem.quantity,
          totalAmount,

        };
      });

      const refundAmount = returnItems.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );
      if (refundAmount <= 0 || previousRefundAmount + refundAmount > sale.paidAmount) {
        throw new BadRequestError("Montant de remboursement invalide");
      }

      await CashService.assertOpen(shopId, tx);

      const saleReturn = await SaleReturnRepository.create(tx, {
        shopId,
        saleId,
        userId,
        idempotencyKey,
        refundAmount,
        reason: data.reason,
        items: returnItems,
      });

      for (const item of returnItems) {
        const updated = item.costAmount === null || item.costAmount === undefined
          ? await StockRepository.incrementProductQuantity(tx, item.productId, shopId, item.quantity)
          : await StockRepository.restoreWithAverageCost(tx, item.productId, shopId, item.quantity, item.costAmount / item.quantity);
        if (updated.count !== 1) throw new BadRequestError("Opération impossible");

        await tx.stockMovement.create({
          data: {
            shopId,
            productId: item.productId,
            userId,
            type: "RETURN",
            quantity: item.quantity,
            unitCost: item.costAmount === null || item.costAmount === undefined ? null : item.costAmount / item.quantity,
            note: `Retour vente ${sale.invoiceNumber || `#${saleId}`}`,
          },
        });
      }

      await CashService.recordOut(
        {
          shopId,
          amount: refundAmount,
          label: `Remboursement ${sale.invoiceNumber || `#${saleId}`}`,
          reference: sale.invoiceNumber || String(saleId),
          paymentMethod: "CASH",
        },
        tx,
      );

      return {
        saleReturn,
        sale: await SaleReturnRepository.findSaleByIdAndShop(tx, saleId, shopId),
        idempotent: false,
      };
    });
  },
};
