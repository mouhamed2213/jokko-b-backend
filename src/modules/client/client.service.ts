import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import type { CreateClientDto, UpdateClientDto } from "./client.dto.js";
import { ClientRepository } from "./client.repository.js";

const assertOwner = async (ownerId: number, shopId: number) => {
  const ownership = await ClientRepository.findOwnership(ownerId, shopId);

  if (!ownership) {
    throw new UnauthorizedError("Accès non autorisé");
  }

  return ownership;
};

const summarizeSales = <T extends {
  sales: Array<{
    totalAmount: number;
    paidAmount: number;
    remaining: number;
  }>;
}>(client: T) => ({
  ...client,
  totalPurchases: client.sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
  totalPaid: client.sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
  totalRemaining: client.sales.reduce(
    (sum, sale) => sum + sale.remaining,
    0,
  ),
});

export const ClientService = {
  getClients: async (shopId: number) => {
    const clients = await ClientRepository.findManyByShop(shopId);
    return clients.map(summarizeSales);
  },

  getClientById: async (shopId: number, id: number) => {
    const client = await ClientRepository.findByIdAndShop(id, shopId);
    if (!client) throw new NotFoundError("Ressource introuvable");
    return summarizeSales(client);
  },

  createClient: async (
    ownerId: number,
    shopId: number,
    data: CreateClientDto,
  ) => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await PlanChecker.plan(shopId, ownership.id);
    const maxCustomers = subscription.limits.customers;

    if (maxCustomers !== null) {
      const customerCount = await ClientRepository.countByShop(shopId);
      if (customerCount >= maxCustomers) {
        throw new ForbiddenError("Opération non autorisée");
      }
    }

    const duplicate = await ClientRepository.findExistingByContact(
      shopId,
      data.phone,
      data.email,
    );
    if (duplicate) {
      throw new AppError("Impossible d'enregistrer le client", 400);
    }

    return ClientRepository.create(shopId, data);
  },

  updateClient: async (
    shopId: number,
    id: number,
    data: UpdateClientDto,
  ) => {
    const existing = await ClientRepository.findByIdAndShop(id, shopId);
    if (!existing) throw new NotFoundError("Ressource introuvable");

    const phoneChanged = data.phone !== undefined && data.phone !== existing.phone;
    const emailChanged = data.email !== undefined && data.email !== existing.email;

    if (phoneChanged || emailChanged) {
      const duplicate = await ClientRepository.findExistingByContact(
        shopId,
        data.phone ?? existing.phone,
        data.email === null ? undefined : data.email ?? existing.email ?? undefined,
        id,
      );
      if (duplicate) {
        throw new AppError("Impossible de modifier le client", 400);
      }
    }

    return ClientRepository.update(id, {
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      email: data.email === undefined ? existing.email : data.email,
      address: data.address === undefined ? existing.address : data.address,
    });
  },

  deleteClient: async (shopId: number, id: number) => {
    const existing = await ClientRepository.findWithSalesCount(id, shopId);
    if (!existing) throw new NotFoundError("Ressource introuvable");

    if (existing._count.sales > 0) {
      throw new AppError("Opération impossible", 400);
    }

    await ClientRepository.delete(id);
  },
};
