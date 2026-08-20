export type CategoryDto = {
  id: number;
  shopId: number;
  name: string;
  createdAt: Date;
  _count?: { products: number };
};

export type CreateCategoryDto = {
  name: string;
};
