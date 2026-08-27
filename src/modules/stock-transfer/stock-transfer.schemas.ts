import { BadRequestError } from "../../utils/errors.js";
import type { CreateStockTransferDto, StockTransferStatus } from "./stock-transfer.dto.js";

const positiveInt = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;

export const StockTransferSchemas = {
  id: (value: unknown) => {
    if (!positiveInt(value)) throw new BadRequestError("Identifiant invalide");
    return Number(value);
  },

  list: (query: Record<string, unknown>) => {
    const allowed: StockTransferStatus[] = ["DRAFT", "SHIPPED", "RECEIVED", "CANCELLED"];
    const status = typeof query.status === "string" ? query.status : undefined;
    if (status && !allowed.includes(status as StockTransferStatus)) throw new BadRequestError("Filtre de statut invalide");
    return {
      status: status as StockTransferStatus | undefined,
      page: Math.min(Math.max(Number(query.page) || 1, 1), 10000),
      limit: Math.min(Math.max(Number(query.limit) || 20, 1), 100),
    };
  },

  create: (body: Record<string, unknown>): CreateStockTransferDto => {
    const destinationShopId = Number(body.destinationShopId);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!positiveInt(destinationShopId) || items.length === 0 || items.length > 100) {
      throw new BadRequestError("Données de transfert invalides");
    }
    const parsedItems = items.map((item) => {
      const value = item as Record<string, unknown>;
      const sourceProductId = Number(value.sourceProductId);
      const destinationProductId = value.destinationProductId === undefined ? undefined : Number(value.destinationProductId);
      const quantity = Number(value.quantity);
      if (!positiveInt(sourceProductId) || (destinationProductId !== undefined && !positiveInt(destinationProductId)) || !positiveInt(quantity)) {
        throw new BadRequestError("Ligne de transfert invalide");
      }
      return { sourceProductId, ...(destinationProductId ? { destinationProductId } : {}), quantity };
    });
    if (new Set(parsedItems.map((item) => item.sourceProductId)).size !== parsedItems.length) {
      throw new BadRequestError("Un produit ne peut apparaître qu'une seule fois");
    }
    return {
      destinationShopId,
      items: parsedItems,
      note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined,
    };
  },
};
