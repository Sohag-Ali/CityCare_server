export interface ICreateZonePayload {
	municipalityId: string;
	name: string;
	code: string;
	description?: string;
}

export interface IUpdateZonePayload {
	name?: string;
	code?: string;
	description?: string;
}

export interface IZoneFilterOptions {
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
