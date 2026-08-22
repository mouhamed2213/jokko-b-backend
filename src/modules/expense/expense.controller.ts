import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { UnauthorizedError } from "../../utils/errors.js";
import { ExpenseSchemas } from "./expense.schemas.js";
import { ExpenseService } from "./expense.service.js";

const assertAuthenticated = (req: AuthRequest) => {
  if (!req.user) throw new UnauthorizedError("Token invalid ou expiré");
  return req.user;
};

export const ExpenseController = {
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const idempotencyKey = String(req.header("Idempotency-Key") || "").trim();
      const data = ExpenseSchemas.create(req.body as Record<string, unknown>);
      const result = await ExpenseService.createExpense(
        user.ownerId,
        user.shopId,
        user.userId,
        idempotencyKey,
        data,
      );

      return res.status(result.idempotent ? 200 : 201).json({
        message: result.idempotent ? "Dépense déjà enregistrée" : "Dépense enregistrée",
        expense: result.expense,
      });
    } catch (error) {
      next(error);
    }
  },

  list: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = ExpenseSchemas.listQuery(req.query as Record<string, unknown>);
      return res.status(200).json(
        await ExpenseService.getExpenses(user.ownerId, user.shopId, query),
      );
    } catch (error) {
      next(error);
    }
  },

  detail: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const id = ExpenseSchemas.id(req.params.id);
      return res.status(200).json(
        await ExpenseService.getExpenseById(user.ownerId, user.shopId, id),
      );
    } catch (error) {
      next(error);
    }
  },

  summary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = assertAuthenticated(req);
      const query = ExpenseSchemas.listQuery(req.query as Record<string, unknown>);
      return res.status(200).json(
        await ExpenseService.getExpenseSummary(user.ownerId, user.shopId, query),
      );
    } catch (error) {
      next(error);
    }
  },
};
