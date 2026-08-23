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

export type PermissionOverrideDto = {
  code: string;
  allowed: boolean;
};

export type UserPermissionsDto = {
  userId: number;
  role: string;
  permissions: Array<PermissionOverrideDto & { effective: boolean }>;
};
