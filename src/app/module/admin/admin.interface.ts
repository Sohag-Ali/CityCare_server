import type { UserStatus } from "../../../generated/prisma/client";

export interface ICreateAdminPayload {
	name: string;
	email: string;
	contactNumber?: string;
	designation?: string;
}

export interface IActivateAdminPayload {
	email: string;
	otp: string;
	password: string;
}

export interface IUpdateAdminPayload {
	name?: string;
	contactNumber?: string;
	designation?: string;
}

export interface IAdminFilterOptions {
	searchTerm?: string;
	status?: UserStatus;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
}
