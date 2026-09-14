import type { Gender, Role } from "../../../generated/prisma/enums";

export interface ICitizenRegisterPayload {
	contactNumber?: string;
	address?: string;
	gender?: Gender;
	age?: number;
	region?: string;
	permanentAddress?: string;
}

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterPatientPayload {
	name: string;
	email: string;
	password: string;
	citizen?: ICitizenRegisterPayload;
}

export interface IRequestUser {
	userId: string;
	email: string;
	name: string;
	role: Role;
}

export interface IGoogleLoginPayload {
	idToken: string;
}

export interface IForgotPasswordPayload {
	email: string;
}
export interface IResetPasswordPayload {
	email: string;
	newPassword: string;
	otp: string;
}
