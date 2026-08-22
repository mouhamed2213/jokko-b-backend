/*
  Warnings:

  - A unique constraint covering the columns `[shopId,saleId,idempotencyKey]` on the table `sale_returns` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "sale_returns_shopId_idempotencyKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_shopId_saleId_idempotencyKey_key" ON "sale_returns"("shopId", "saleId", "idempotencyKey");
