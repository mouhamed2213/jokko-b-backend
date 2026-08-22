/*
  Warnings:

  - A unique constraint covering the columns `[receiptId]` on the table `supplier_debts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "supplier_debts" ADD COLUMN     "receiptId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "supplier_debts_receiptId_key" ON "supplier_debts"("receiptId");

-- AddForeignKey
ALTER TABLE "supplier_debts" ADD CONSTRAINT "supplier_debts_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "purchase_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
