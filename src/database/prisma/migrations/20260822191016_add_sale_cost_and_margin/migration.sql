-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "costTotal" DOUBLE PRECISION,
ADD COLUMN     "marginAmount" DOUBLE PRECISION,
ADD COLUMN     "unitCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "sale_return_items" ADD COLUMN     "costAmount" DOUBLE PRECISION;
