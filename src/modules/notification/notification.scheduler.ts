import { logger } from "../../config/logger.js";
import { NotificationService } from "./notification.service.js";

export const NotificationScheduler = {
  start: () => {
    const stop = NotificationService.startDailyScheduler();
    logger.info("Planificateur des alertes métier démarré");
    return stop;
  },
};
