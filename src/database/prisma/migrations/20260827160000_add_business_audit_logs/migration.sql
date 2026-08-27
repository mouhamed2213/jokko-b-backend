CREATE TABLE "business_audit_logs" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_audit_logs_shopId_createdAt_idx" ON "business_audit_logs"("shopId", "createdAt");
CREATE INDEX "business_audit_logs_shopId_action_createdAt_idx" ON "business_audit_logs"("shopId", "action", "createdAt");
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_audit_logs" ADD CONSTRAINT "business_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
