import { env } from "./config/env-config.js";
import { logger } from "./config/logger.js";
import { NotificationScheduler } from "./modules/notification/notification.scheduler.js";
import { app } from "./app.js";

app.listen(env.port, () => {
  logger.info(`✅ Jokko Business API démarrée sur ${env.server}:${env.port}`);
  logger.info(`📁 Uploads servis sur ${env.server}:${env.port}/uploads/`);
  logger.info(`🌍 Environnement : ${env.mode}`);
  NotificationScheduler.start();
});
