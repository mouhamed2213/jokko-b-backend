export type ClientDto = {
  id: number;
  shopId: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalPurchases?: number;
  totalPaid?: number;
  totalRemaining?: number;
};

export type ClientDetailDto = ClientDto & {
  sales: unknown[];
};

export type CreateClientDto = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export type UpdateClientDto = {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
};
