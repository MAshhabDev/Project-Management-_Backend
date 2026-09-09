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

export interface IGoogleLoginPayload {
	idToken: string;
}
export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}


export interface IForgotPasswordPayload {
	email: string;
}
export interface IResetPasswordPayload {
	email: string;
	newPassword: string;
	otp: string;
}