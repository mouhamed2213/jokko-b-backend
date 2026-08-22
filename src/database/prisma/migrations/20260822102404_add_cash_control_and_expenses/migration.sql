-- AlterEnum
ALTER TYPE "FeatureCode" ADD VALUE 'CASH_CONTROL';

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "userId" INTEGER,
    "cashTransactionId" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_cashTransactionId_key" ON "expenses"("cashTransactionId");

-- CreateIndex
CREATE INDEX "expenses_shopId_category_createdAt_idx" ON "expenses"("shopId", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_shopId_idempotencyKey_key" ON "expenses"("shopId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
