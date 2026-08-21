import { NotificationRepository } from "./notification.repository.js";
import { NotificationSchemas } from "./notification.schemas.js";
import type {
  NotificationEventDto,
  StockAlertProductDto,
  StockAlertsDto,
} from "./notification.dto.js";

type NotificationClient = {
  write: (payload: string) => unknown;
};

const clients = new Map<number, Set<NotificationClient>>();

const splitStockAlerts = <T extends StockAlertProductDto>(
  products: T[],
): StockAlertsDto => {
  const lowStock = products.filter(
    (product) => product.quantity > 0 && product.quantity <= product.alertThreshold,
  );
  const outOfStock = products.filter((product) => product.quantity === 0);

  return {
    lowStock,
    outOfStock,
    total: lowStock.length + outOfStock.length,
  };
};

const eventPayload = (event: string, data: NotificationEventDto) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const NotificationService = {
  addClient: (shopId: number, client: NotificationClient) => {
    if (!clients.has(shopId)) clients.set(shopId, new Set());
    clients.get(shopId)!.add(client);
    return clients.get(shopId)!.size;
  },

  removeClient: (shopId: number, client: NotificationClient) => {
    const shopClients = clients.get(shopId);
    if (!shopClients) return 0;
    shopClients.delete(client);
    if (shopClients.size === 0) clients.delete(shopId);
    return shopClients.size;
  },

  writeToClient: (
    client: NotificationClient,
    event: string,
    data: NotificationEventDto,
  ) => {
    const validated = NotificationSchemas.event(event, data);
    client.write(eventPayload(validated.event, validated.data));
  },

  sendToShop: (shopId: number, event: string, data: NotificationEventDto) => {
    const validated = NotificationSchemas.event(event, data);
    const shopClients = clients.get(shopId);
    if (!shopClients || shopClients.size === 0) return 0;

    let delivered = 0;
    shopClients.forEach((client) => {
      try {
        NotificationService.writeToClient(client, validated.event, validated.data);
        delivered += 1;
      } catch {
        shopClients.delete(client);
      }
    });

    if (shopClients.size === 0) clients.delete(shopId);
    return delivered;
  },

  getInitialStockAlerts: async (shopId: number) => {
    const products = await NotificationRepository.findProductsForStream(shopId);
    return splitStockAlerts(products);
  },

  getStockAlerts: async (shopId: number) => {
    const products = await NotificationRepository.findProductsForStockAlerts(shopId);
    return splitStockAlerts(products);
  },
};
