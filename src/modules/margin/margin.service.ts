import { PlanChecker } from "../../services/plan-checker.service.js";
import { ForbiddenError } from "../../utils/errors.js";
import type { MarginQueryDto, MarginSummary } from "./margin.dto.js";
import { MarginRepository } from "./margin.repository.js";

export const MarginService = {
  getSummary: async (ownerId: number, shopId: number, query: MarginQueryDto): Promise<MarginSummary> => {
    const subscription = await PlanChecker.plan(shopId, ownerId);
    if (subscription.plan.code === "FREE" || subscription.plan.code === "BASIC") {
      throw new ForbiddenError("Opération non autorisée");
    }
    const result = await MarginRepository.calculate(shopId, query);
    return {
      period: {
        from: query.from?.toISOString() ?? null,
        to: query.to?.toISOString() ?? null,
      },
      ...result,
    };
  },
};
