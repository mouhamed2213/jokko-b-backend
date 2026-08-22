-- CreateTable
CREATE TABLE "client_reminders" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_reminders_shopId_clientId_createdAt_idx" ON "client_reminders"("shopId", "clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "client_reminders" ADD CONSTRAINT "client_reminders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_reminders" ADD CONSTRAINT "client_reminders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_reminders" ADD CONSTRAINT "client_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
