import { BadRequestError } from "../../utils/errors.js";
import type { CreatePurchaseOrderDto, PurchaseOrderStatus, ReceivePurchaseOrderDto } from "./purchase-order.dto.js";

const positiveInt = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;
const positiveNumber = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;

export const PurchaseOrderSchemas = {
  id: (value: unknown) => {
    if (!positiveInt(value)) throw new BadRequestError("Identifiant invalide");
    return Number(value);
  },

  list: (query: Record<string, unknown>) => {
    const allowed: PurchaseOrderStatus[] = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];
    const status = typeof query.status === "string" ? query.status : undefined;
    if (status && !allowed.includes(status as PurchaseOrderStatus)) throw new BadRequestError("Filtre invalide");
    return {
      status: status as PurchaseOrderStatus | undefined,
      page: Math.min(Math.max(Number(query.page) || 1, 1), 10000),
      limit: Math.min(Math.max(Number(query.limit) || 20, 1), 100),
    };
  },

  create: (body: Record<string, unknown>): CreatePurchaseOrderDto => {
    const supplierId = Number(body.supplierId);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!positiveInt(supplierId) || items.length === 0 || items.length > 100) {
      throw new BadRequestError("Données de commande invalides");
    }
    const parsedItems = items.map((item) => {
      const value = item as Record<string, unknown>;
      const productId = Number(value.productId);
      const quantityOrdered = Number(value.quantityOrdered);
      const unitCost = Number(value.unitCost);
      if (!positiveInt(productId) || !positiveInt(quantityOrdered) || !positiveNumber(unitCost)) {
        throw new BadRequestError("Ligne de commande invalide");
      }
      return { productId, quantityOrdered, unitCost };
    });
    return { supplierId, items: parsedItems, note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined };
  },

  receive: (body: Record<string, unknown>): ReceivePurchaseOrderDto => {
    const items = Array.isArray(body.items) ? body.items : [];
    const paidAmount = body.paidAmount === undefined ? 0 : Number(body.paidAmount);
    if (items.length === 0 || items.length > 100 || !Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new BadRequestError("Données de réception invalides");
    }
    return {
      items: items.map((item) => {
        const value = item as Record<string, unknown>;
        const orderItemId = Number(value.orderItemId);
        const quantity = Number(value.quantity);
        const unitCost = value.unitCost === undefined ? undefined : Number(value.unitCost);
        if (!positiveInt(orderItemId) || !positiveInt(quantity) || (unitCost !== undefined && !positiveNumber(unitCost))) {
          throw new BadRequestError("Ligne de réception invalide");
        }
        return { orderItemId, quantity, unitCost };
      }),
      note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined,
      paidAmount,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod.trim().slice(0, 30) : "CASH",
    };
  },
};
