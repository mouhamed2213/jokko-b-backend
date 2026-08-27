CREATE TABLE "catalog_products" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "baseSalePrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_price_rules" (
    "id" SERIAL NOT NULL,
    "catalogProductId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_price_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_products_ownerId_reference_key" ON "catalog_products"("ownerId", "reference");
CREATE INDEX "catalog_products_ownerId_isActive_idx" ON "catalog_products"("ownerId", "isActive");
CREATE UNIQUE INDEX "catalog_price_rules_catalogProductId_shopId_key" ON "catalog_price_rules"("catalogProductId", "shopId");
CREATE INDEX "catalog_price_rules_shopId_idx" ON "catalog_price_rules"("shopId");

ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_price_rules" ADD CONSTRAINT "catalog_price_rules_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_price_rules" ADD CONSTRAINT "catalog_price_rules_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
