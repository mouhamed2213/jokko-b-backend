-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "outOfStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dormantProductEnabled" BOOLEAN NOT NULL DEFAULT true,
    "clientDebtEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supplierDebtEnabled" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionExpiryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marginEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cashDiscrepancyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dormantDays" INTEGER NOT NULL DEFAULT 30,
    "subscriptionExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "clientDebtThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "supplierDebtThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "marginRateThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "deduplicationKey" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_shopId_key" ON "notification_preferences"("shopId");
CREATE UNIQUE INDEX "notifications_shopId_deduplicationKey_key" ON "notifications"("shopId", "deduplicationKey");
CREATE INDEX "notifications_shopId_resolvedAt_createdAt_idx" ON "notifications"("shopId", "resolvedAt", "createdAt");
CREATE INDEX "notifications_shopId_readAt_createdAt_idx" ON "notifications"("shopId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
