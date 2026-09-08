import type { Role } from "../../../generated/prisma/enums";

export interface ILogin {
  email: string;
  password: string;
}

export interface ICreate {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
  address?: string;
}