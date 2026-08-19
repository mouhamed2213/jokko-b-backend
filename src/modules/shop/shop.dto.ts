export type SwitchShopDto = {
  userId: number;
  password: string;
  targetShopId: number;
};

export type SwitchShopUserDto = {
  id: number;
  name: string;
  email: string;
  role: string;
  plan: string;
  shopId: number;
  shopName: string;
};

export type SwitchShopResult = {
  token: string;
  user: SwitchShopUserDto;
};
