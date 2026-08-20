import { UserController as DomainUserController } from "../modules/user/user.controller.js";

export const getUsers = DomainUserController.getUsers;
export const createUser = DomainUserController.createUser;
export const updateUser = DomainUserController.updateUser;
export const deleteUser = DomainUserController.deleteUser;
