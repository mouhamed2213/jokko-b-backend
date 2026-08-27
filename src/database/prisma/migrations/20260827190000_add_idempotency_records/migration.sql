CREATE TABLE "idempotency_records" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "shopId" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_ownerId_idempotencyKey_key" ON "idempotency_records"("ownerId", "idempotencyKey");
CREATE INDEX "idempotency_records_createdAt_idx" ON "idempotency_records"("createdAt");
