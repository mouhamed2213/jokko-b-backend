import { prisma } from "../../config/prisma.js";
import { ProcurementService } from "../procurement/procurement.service.js";
import { NotificationService } from "../notification/notification.service.js";

import { AppError, BadRequestError, ConflictError, NotFoundError } from "../../utils/errors.js";
import type {
  StockEntryDto,
  StockMovementQueryDto,
  StockOutDto,
} from "./stock.dto.js";
import { StockRepository } from "./stock.repository.js";

export const StockService = {
  addStockEntry: async (
    shopId: number,
    userId: number,
    data: StockEntryDto,
    expectedUpdatedAt?: string,
  ) => {
    const product = await StockRepository.findProductByIdAndShop(
      data.productId,
      shopId,
    );
        if (!product) throw new NotFoundError("Ressource introuvable");
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(product.updatedAt).getTime()) {
      throw new ConflictError("Le stock a été modifié depuis sa mise en cache");
    }

    const supplier = data.supplierId
      ? await StockRepository.findSupplierByIdAndShop(data.supplierId, shopId)
      : null;
    if (data.supplierId && !supplier) {
      throw new NotFoundError("Ressource introuvable");
    }

    const totalCost = data.unitCost ? data.unitCost * data.quantity : null;
    if (data.paidAmount > 0) {
      if (!supplier || !data.createDebt || !totalCost) {
        throw new BadRequestError("Opération financière invalide");
      }
      if (data.paidAmount > totalCost) {
        throw new BadRequestError("Opération financière invalide");
      }
    }

    return prisma.$transaction(async (tx) => {
      const incremented = data.unitCost && data.unitCost > 0
        ? await StockRepository.applyEntryWithAverageCost(
            tx,
            data.productId,
            shopId,
            data.quantity,
            data.unitCost,
          )
        : await StockRepository.incrementProductQuantity(
            tx,
            data.productId,
            shopId,
            data.quantity,
          );
      if (incremented.count !== 1) {
        throw new NotFoundError("Ressource introuvable");
      }

      const updatedProduct = await StockRepository.findProductByIdInTransaction(
        tx,
        data.productId,
        shopId,
      );
      if (!updatedProduct) throw new NotFoundError("Ressource introuvable");

      const movement = await StockRepository.createMovement(
        tx,
        shopId,
        userId,
        data,
        "ENTRY",
      );

      let debt = null;
      if (supplier && data.createDebt && totalCost && totalCost > 0) {
        const obligation = await ProcurementService.recordSupplierObligation(
          {
            shopId,
            supplierId: supplier.id,
            supplierName: supplier.name,
            productName: product.name,
            quantity: data.quantity,
            totalAmount: totalCost,
            paidAmount: data.paidAmount,
            note: data.note,
            paymentMethod: "CASH",
          },
          tx,
        );
        debt = obligation.debt;
      }

      return { updatedProduct, movement, debt };
    });
  },

  addStockOut: async (shopId: number, userId: number, data: StockOutDto, expectedUpdatedAt?: string) => {
    const product = await StockRepository.findProductByIdAndShop(
      data.productId,
      shopId,
    );
        if (!product) throw new NotFoundError("Ressource introuvable");
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(product.updatedAt).getTime()) {
      throw new ConflictError("Le stock a été modifié depuis sa mise en cache");
    }

    const result = await prisma.$transaction(async (tx) => {
      const decremented = await StockRepository.decrementProductQuantity(
        tx,
        data.productId,
        shopId,
        data.quantity,
      );
      if (decremented.count !== 1) {
        throw new AppError("Stock insuffisant", 400);
      }

      const updatedProduct = await StockRepository.findProductByIdInTransaction(
        tx,
        data.productId,
        shopId,
      );
      if (!updatedProduct) throw new NotFoundError("Ressource introuvable");

      const movement = await StockRepository.createMovement(
        tx,
        shopId,
        userId,
        data,
        "OUT",
      );

      return { updatedProduct, movement };
    });

    if (result.updatedProduct.quantity === 0) {
      NotificationService.sendToShop(shopId, "stock_alert", {
        type: "out_of_stock",
        outOfStock: [{ id: result.updatedProduct.id, name: result.updatedProduct.name, quantity: 0 }],
        lowStock: [],
        total: 1,
      });
    } else if (result.updatedProduct.quantity <= product.alertThreshold) {
      NotificationService.sendToShop(shopId, "stock_alert", {
        type: "low_stock",
        lowStock: [{
          id: result.updatedProduct.id,
          name: result.updatedProduct.name,
          quantity: result.updatedProduct.quantity,
          alertThreshold: result.updatedProduct.alertThreshold,
        }],
        outOfStock: [],
        total: 1,
      });
    }

    return result;
  },

  getStockMovements: async (
    shopId: number,
    query: StockMovementQueryDto,
  ) => {
    const result = await StockRepository.findMovements(shopId, query);
    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  },
};
