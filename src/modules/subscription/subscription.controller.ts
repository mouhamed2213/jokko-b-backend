import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { NotFoundError } from "../../utils/errors.js";
import { SubscriptionService } from "./subscription.service.js";

export const SubscriptionController = {
  getCurrentSubs: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        throw new NotFoundError("Shop not found");
      }

      const subscription = await SubscriptionService.currentSubscription(
        req.user.shopId,
        req.user.ownerId,
      );

      return res.status(200).json({ message: "Subscription", subscription });
    } catch (error) {
      next(error);
    }
  },
};
