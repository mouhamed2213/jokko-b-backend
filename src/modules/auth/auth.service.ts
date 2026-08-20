import { NotFoundError } from "../../utils/errors.js";
import { AuthRepository } from "./auth.repository.js";

export const AuthService = {
  getMe: async (userId: number, shopId: number) => {
    const user = await AuthRepository.findUserByShop(userId, shopId);

    if (!user) {
      throw new NotFoundError("not found");
    }

    return AuthRepository.findShopWithSubscription(shopId);
  },
};
