CREATE TABLE "stock_transfers" (
    "id" SERIAL NOT NULL,
    "sourceShopId" INTEGER NOT NULL,
    "destinationShopId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_transfer_items" (
    "id" SERIAL NOT NULL,
    "transferId" INTEGER NOT NULL,
    "sourceProductId" INTEGER NOT NULL,
    "destinationProductId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_transfers_reference_key" ON "stock_transfers"("reference");
CREATE INDEX "stock_transfers_sourceShopId_status_idx" ON "stock_transfers"("sourceShopId", "status");
CREATE INDEX "stock_transfers_destinationShopId_status_idx" ON "stock_transfers"("destinationShopId", "status");
CREATE UNIQUE INDEX "stock_transfer_items_transferId_sourceProductId_key" ON "stock_transfer_items"("transferId", "sourceProductId");

ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sourceShopId_fkey" FOREIGN KEY ("sourceShopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destinationShopId_fkey" FOREIGN KEY ("destinationShopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_destinationProductId_fkey" FOREIGN KEY ("destinationProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
