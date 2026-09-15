export interface ICreateDepartmentPayload {
	municipalityId: string;
	name: string;
	code: string;
	description?: string;
	email?: string;
	phone?: string;
}

export interface IUpdateDepartmentPayload {
	name?: string;
	code?: string;
	description?: string;
	email?: string;
	phone?: string;
}

export interface IDepartmentFilterOptions {
	municipalityId?: string;
	isActive?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
