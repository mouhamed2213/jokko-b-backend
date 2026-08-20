import bcrypt from "bcrypt";
import { SubscriptionService } from "../../services/subscription.service.js";
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors.js";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
} from "./user.dto.js";
import { UserRepository } from "./user.repository.js";

const assertOwner = async (ownerId: number, shopId: number) => {
  const ownership = await UserRepository.findOwnership(ownerId, shopId);

  if (!ownership) {
    throw new UnauthorizedError("Accée non autorisé");
  }

  return ownership;
};

const quotaMessage = (planCode: string, maxUsers: number): string => {
  if (planCode === "FREE") {
    return "Vous avez atteind le nombre d'utilisateur avec le plan gratuit";
  }
  if (planCode === "BASIC") {
    return "Vous avez atteind le nombre d'utilisateur avec le plan Basic";
  }

  return `Limite d'utilisateurs atteinte (${maxUsers})`;
};

export const UserService = {
  getUsers: async (ownerId: number, shopId: number): Promise<UserDto[]> => {
    await assertOwner(ownerId, shopId);
    return UserRepository.findUsersByShop(shopId);
  },

  createUser: async (
    ownerId: number,
    shopId: number,
    data: CreateUserDto,
  ): Promise<UserDto> => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await SubscriptionService.currentSubscription(
      shopId,
      ownership.id,
    );
    const userCount = await UserRepository.countByShop(shopId);
    const maxUsers = subscription.limits.users;

    if (maxUsers !== null && userCount >= maxUsers) {
      throw new AppError(
        quotaMessage(subscription.plan.code, maxUsers),
        403,
      );
    }

    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Cet email est déjà utilisé");
    }

    const password = await bcrypt.hash(data.password, 10);

    return UserRepository.create({
      shopId,
      name: data.name,
      email: data.email,
      password,
      role: data.role ?? "EMPLOYEE",
    });
  },

  updateUser: async (
    ownerId: number,
    shopId: number,
    userId: number,
    data: UpdateUserDto,
  ): Promise<UserDto> => {
    await assertOwner(ownerId, shopId);

    const existingUser = await UserRepository.findByIdAndShop(userId, shopId);
    if (!existingUser) {
      throw new NotFoundError("Utilisateur introuvable");
    }

    const updateData: {
      name?: string;
      role?: "ADMIN" | "EMPLOYEE";
      isActive?: boolean;
      password?: string;
    } = {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return UserRepository.update(userId, updateData);
  },

  deleteUser: async (
    ownerId: number,
    shopId: number,
    userId: number,
    currentUserId: number,
  ): Promise<void> => {
    await assertOwner(ownerId, shopId);

    if (userId === currentUserId) {
      throw new AppError(
        "Vous ne pouvez pas supprimer votre propre compte",
        400,
      );
    }

    const existingUser = await UserRepository.findByIdAndShop(userId, shopId);
    if (!existingUser) {
      throw new NotFoundError("Utilisateur introuvable");
    }

    await UserRepository.delete(userId);
  },

  findUser: async (email: string) => UserRepository.findByEmail(email),
};
