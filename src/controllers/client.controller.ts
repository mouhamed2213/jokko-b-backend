import { ClientController as DomainClientController } from "../modules/client/client.controller.js";

export const getClients = DomainClientController.getClients;
export const getClientById = DomainClientController.getClientById;
export const getClientStatement = DomainClientController.getClientStatement;
export const createClientReminder = DomainClientController.createClientReminder;

export const createClient = DomainClientController.createClient;
export const importClientsCsv = DomainClientController.importCsv;

export const updateClient = DomainClientController.updateClient;
export const deleteClient = DomainClientController.deleteClient;
