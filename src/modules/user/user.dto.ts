export type UserRole = "ADMIN" | "EMPLOYEE";

export type UserDto = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type UpdateUserDto = {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};
