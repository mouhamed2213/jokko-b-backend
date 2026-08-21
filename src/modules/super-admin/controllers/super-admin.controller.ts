import { SuperAdminController } from "../super-admin.controller.js";

export const SuperAdminShopController = {
  ...SuperAdminController,
  subscription: SuperAdminController.changePlan,
  extendTrialPeriod: SuperAdminController.extendSubscription,
};
