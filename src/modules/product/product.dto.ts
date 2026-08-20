export type ProductDto = {
  id: number;
  shopId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  reference: string | null;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  semiWholesalePrice: number | null;
  semiWholesaleMinQty: number | null;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  alertThreshold: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { id: number; name: string } | null;
};

export type ProductListQueryDto = {
  search: string;
  categoryId?: number;
  page: number;
  limit: number;
};

export type CreateProductDto = {
  name: string;
  description?: string;
  reference?: string;
  categoryId?: number | null;
  purchasePrice: number;
  salePrice: number;
  alertThreshold: number;
  imageUrl?: string | null;
  semiWholesalePrice?: number | null;
  semiWholesaleMinQty?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
};

export type UpdateProductDto = {
  name?: string;
  description?: string | null;
  reference?: string | null;
  categoryId?: number | null;
  purchasePrice?: number;
  salePrice?: number;
  alertThreshold?: number;
  imageUrl?: string | null;
  semiWholesalePrice?: number | null;
  semiWholesaleMinQty?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
};

export type ProductPriceDto = {
  salePrice: number;
  semiWholesalePrice: number | null;
  semiWholesaleMinQty: number | null;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
};

export type SuggestedPriceDto = {
  quantity: number;
  suggestedPrice: number;
  tier: "detail" | "semiWholesale" | "wholesale";
  tiers: {
    detail: { price: number; label: string };
    semiWholesale: { price: number; minQty: number; label: string } | null;
    wholesale: { price: number; minQty: number; label: string } | null;
  };
};
