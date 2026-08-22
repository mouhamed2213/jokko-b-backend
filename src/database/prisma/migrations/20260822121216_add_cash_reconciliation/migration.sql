-- CreateTable
CREATE TABLE "cash_reconciliations" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "cashRegisterId" INTEGER NOT NULL,
    "userId" INTEGER,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "countedAmount" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_reconciliations_cashRegisterId_key" ON "cash_reconciliations"("cashRegisterId");

-- CreateIndex
CREATE INDEX "cash_reconciliations_shopId_createdAt_idx" ON "cash_reconciliations"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
