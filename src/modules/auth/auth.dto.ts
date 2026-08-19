export type AuthenticatedUserContext = {
  ownerId: number;
  userId: number;
  shopId: number;
  role: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type MeQuery = {
  userId: number;
  shopId: number;
};
