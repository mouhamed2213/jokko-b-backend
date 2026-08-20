import { ClientController as DomainClientController } from "../modules/client/client.controller.js";

export const getClients = DomainClientController.getClients;
export const getClientById = DomainClientController.getClientById;
export const createClient = DomainClientController.createClient;
export const updateClient = DomainClientController.updateClient;
export const deleteClient = DomainClientController.deleteClient;
