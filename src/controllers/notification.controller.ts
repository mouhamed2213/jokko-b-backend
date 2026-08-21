import { NotificationController as DomainNotificationController } from "../modules/notification/notification.controller.js";
import { NotificationService } from "../modules/notification/notification.service.js";

export const sendNotificationToShop = NotificationService.sendToShop;
export const streamNotifications = DomainNotificationController.streamNotifications;
export const getStockAlerts = DomainNotificationController.getStockAlerts;
