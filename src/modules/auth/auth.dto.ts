export type AuthenticatedUserContext = {
  ownerId: number;
  userId: number;
  shopId: number;
  role: string;
};

export type AuthTokenPayload = AuthenticatedUserContext & {
  email?: string;
  plan?: boolean;
  planType?: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthUserDto = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  shopId: number;
  shopName: string;
};

export type LoginResult = {
  token: string;
  user: AuthUserDto;
};

export type MeQuery = {
  userId: number;
  shopId: number;
};
