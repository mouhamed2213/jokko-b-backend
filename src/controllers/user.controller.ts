import { UserController as DomainUserController } from "../modules/user/user.controller.js";

export const getUsers = DomainUserController.getUsers;
export const createUser = DomainUserController.createUser;
export const updateUser = DomainUserController.updateUser;
export const deleteUser = DomainUserController.deleteUser;
export const getUserPermissions = DomainUserController.getPermissions;
export const updateUserPermissions = DomainUserController.updatePermissions;
