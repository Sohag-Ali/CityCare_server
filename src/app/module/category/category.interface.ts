export interface ICreateCategoryPayload {
	departmentId: string;
	name: string;
	code: string;
	description?: string;
}

export interface IUpdateCategoryPayload {
	name?: string;
	code?: string;
	description?: string;
}

export interface ICategoryFilterOptions {
	departmentId?: string;
	isActive?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number | string;
	limit?: number | string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
