import { prisma } from "../../config/prisma.js";
import { parseCsv } from "../../utils/csv.js";
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { PlanChecker } from "../subscription/plan-checker.service.js";
import type {
  ClientStatementQueryDto,
  CreateClientDto,
  CreateClientReminderDto,
  UpdateClientDto,
} from "./client.dto.js";
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

  getClientStatement: async (
    ownerId: number,
    shopId: number,
    clientId: number,
    query: ClientStatementQueryDto,
  ) => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await PlanChecker.plan(shopId, ownership.id);
    if (
      ["EXPIRED", "SUSPENDED", "TRIAL_EXPIRED"].includes(subscription.status) ||
      subscription.plan.code === "FREE"
    ) {
      throw new ForbiddenError("Opération non autorisée");
    }

    const client = await ClientRepository.findStatementByIdAndShop(clientId, shopId, query);
    if (!client) throw new NotFoundError("Ressource introuvable");

    const sales = client.sales as any[];
    const summary = sales.reduce(
      (totals, sale) => {
        const refunded = (sale.returns || []).reduce(
          (sum: number, saleReturn: any) => sum + saleReturn.refundAmount,
          0,
        );
        totals.invoiced += sale.totalAmount;
        totals.paid += sale.paidAmount;
        totals.refunded += refunded;
        totals.grossRemaining += sale.remaining;
        totals.netRemaining += sale.remaining - refunded;
        return totals;
      },
      { invoiced: 0, paid: 0, refunded: 0, grossRemaining: 0, netRemaining: 0 },
    );

    return {
      client: {
        id: client.id,
        shopId: client.shopId,
        name: client.name,
        phone: client.phone,
        email: client.email,
        address: client.address,
      },
      period: { from: query.from || null, to: query.to || null },
      summary: {
        ...summary,
        amountDue: Math.max(summary.netRemaining, 0),
        creditBalance: Math.max(-summary.netRemaining, 0),
      },
      sales: sales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        remaining: sale.remaining,
        status: sale.status,
        createdAt: sale.createdAt,
        items: sale.items,
        payments: sale.payments,
        returns: sale.returns,
        netRemaining: sale.remaining - (sale.returns || []).reduce(
          (sum: number, saleReturn: any) => sum + saleReturn.refundAmount,
          0,
        ),
      })),
      reminders: client.reminders.map((reminder: any) => ({
        id: reminder.id,
        amountDue: reminder.amountDue,
        message: reminder.message,
        channel: reminder.channel,
        createdAt: reminder.createdAt,
        user: reminder.user,
      })),
    };
  },

    importCsv: async (ownerId: number, shopId: number, file: Express.Multer.File) => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await PlanChecker.plan(shopId, ownership.id);
    const rows = parseCsv(file.buffer);
    const clients = rows.map((row) => ({
      name: String(row.name || row.nom || "").trim(),
      phone: String(row.phone || row.telephone || row.tel || "").trim(),
      email: String(row.email || "").trim() || null,
      address: String(row.address || row.adresse || "").trim() || null,
    }));

    if (clients.some((client) => !client.name || !client.phone)) {
      throw new AppError("CSV invalide", 400);
    }
    const phones = clients.map((client) => client.phone);
    const emails = clients.flatMap((client) => client.email ? [client.email] : []);
    if (new Set(phones).size !== phones.length || new Set(emails).size !== emails.length) {
      throw new AppError("CSV contient des doublons", 400);
    }

    const currentCustomers = await ClientRepository.countByShop(shopId);
    const maxCustomers = subscription.limits.customers;
    if (maxCustomers !== null && currentCustomers + clients.length > maxCustomers) {
      throw new ForbiddenError("Opération non autorisée");
    }

    const conflicts = await ClientRepository.findImportConflicts(shopId, phones, emails);
    if (conflicts.length) throw new AppError("CSV contient des doublons", 400);

    await prisma.$transaction(async (tx) => {
      for (const client of clients) {
        await tx.client.create({ data: { shopId, ...client } });
      }
    });

    return { imported: clients.length };
  },

  createClientReminder: async (

    ownerId: number,
    shopId: number,
    userId: number,
    clientId: number,
    data: CreateClientReminderDto,
  ) => {
    const statement = await ClientService.getClientStatement(ownerId, shopId, clientId, {});
    if (statement.summary.amountDue <= 0) throw new BadRequestError("Opération impossible");

    const message = data.message ||
      `Rappel : votre solde restant est de ${statement.summary.amountDue} FCFA.`;
    const reminder = await ClientRepository.createReminder(
      clientId,
      shopId,
      userId,
      statement.summary.amountDue,
      message,
    );

    return {
      id: reminder.id,
      amountDue: reminder.amountDue,
      message: reminder.message,
      channel: reminder.channel,
      createdAt: reminder.createdAt,
      user: reminder.user,
    };
  },
};
