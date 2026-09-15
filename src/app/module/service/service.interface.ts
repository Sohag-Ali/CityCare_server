export interface ICreateServicePayload {
	categoryId: string;
	name: string;
	code: string;
	description?: string;
	isPaid?: boolean;
	baseFee?: number;
	currency?: string;
}

export interface IUpdateServicePayload {
	name?: string;
	code?: string;
	description?: string;
	isPaid?: boolean;
	baseFee?: number;
	currency?: string;
}

export interface IServiceFilterOptions {
	categoryId?: string;
	departmentId?: string;
	isPaid?: string;
	isActive?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number | string;
	limit?: number | string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
