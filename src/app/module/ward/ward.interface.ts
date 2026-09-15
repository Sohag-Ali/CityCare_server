export interface ICreateWardPayload {
	municipalityId: string;
	zoneId: string;
	name: string;
	code: string;
	wardNumber: number;
	description?: string;
}

export interface IUpdateWardPayload {
	name?: string;
	code?: string;
	wardNumber?: number;
	description?: string;
}

export interface IWardFilterOptions {
	municipalityId?: string;
	zoneId?: string;
	isActive?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
