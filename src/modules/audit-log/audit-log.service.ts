import { prisma } from "../../config/prisma.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";

const assertPremium = async (ownerId: number, shopId: number) => {
  const subscription = await PlanChecker.plan(shopId, ownerId);
  if (subscription.plan.code !== "PREMIUM") throw new ForbiddenError("L'audit exportable nécessite un plan Premium");
};

export const AuditLogService = {
  list: async (ownerId: number, shopId: number, limit = 100) => {
    await assertPremium(ownerId, shopId);
    return prisma.businessAuditLog.findMany({ where: { shopId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 500) });
  },
  csv: async (ownerId: number, shopId: number) => {
    const rows = await AuditLogService.list(ownerId, shopId, 500);
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    return ["Date;Action;Type;Identifiant;Détails", ...rows.map((row) => [row.createdAt.toISOString(), row.action, row.entityType, row.entityId ?? "", row.details ? JSON.stringify(row.details) : ""].map(escape).join(";"))].join("\n");
  },
};
