const returnInclude = {
  items: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

type DatabaseClient = any;

export const SaleReturnRepository = {
  findOwnership: async (db: DatabaseClient, ownerId: number, shopId: number) =>
    db.shopOwner.findUnique({
      where: { userId_shopId: { userId: ownerId, shopId } },
      select: { id: true },
    }),

  findSaleByIdAndShop: async (
    db: DatabaseClient,
    saleId: number,
    shopId: number,
  ) =>
    db.sale.findFirst({
      where: { id: saleId, shopId },
      include: {
        items: true,
      },
    }),

  findByIdempotencyKey: async (
    db: DatabaseClient,
    shopId: number,
    saleId: number,
    idempotencyKey: string,
  ) =>
    db.saleReturn.findUnique({
      where: { shopId_saleId_idempotencyKey: { shopId, saleId, idempotencyKey } },
      include: returnInclude,
    }),

  findBySaleId: async (db: DatabaseClient, saleId: number, shopId: number) =>
    db.saleReturn.findMany({
      where: { saleId, shopId },
      include: returnInclude,
      orderBy: { createdAt: "asc" },
    }),

  create: async (
    db: DatabaseClient,
    input: {
      shopId: number;
      saleId: number;
      userId: number;
      idempotencyKey: string;
      refundAmount: number;
      reason?: string;
      items: Array<{
        saleItemId: number;
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
      }>;
    },
  ) =>
    db.saleReturn.create({
      data: {
        shopId: input.shopId,
        saleId: input.saleId,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        refundAmount: input.refundAmount,
        reason: input.reason || null,
        status: "COMPLETED",
        items: { create: input.items },
      },
      include: returnInclude,
    }),
};
