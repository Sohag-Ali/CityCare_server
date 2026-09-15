import type { StaffType } from "../../../generated/prisma/enums";

export interface ICreateStaffPayload {
	name: string;
	email: string;
	departmentId: string;
	staffType: StaffType;
	employeeId: string;
	designation: string;
	joiningDate: string | Date;
	contactNumber?: string;
}

export interface IUpdateStaffPayload {
	name?: string;
	employeeId?: string;
	departmentId?: string;
	staffType?: StaffType;
	designation?: string;
	joiningDate?: string | Date;
	contactNumber?: string;
	isActive?: boolean;
}

export interface IStaffFilterOptions {
	departmentId?: string;
	staffType?: StaffType;
	isActive?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
