export interface ICreateMunicipalityPayload {
	name: string;
	code: string;
	country: string;
	timezone: string;
	currency: string;
	contactEmail?: string;
	contactPhone?: string;
	logoUrl?: string;
	isActive?: boolean;
}

export interface IUpdateMunicipalityPayload {
	name?: string;
	code?: string;
	country?: string;
	timezone?: string;
	currency?: string;
	contactEmail?: string;
	contactPhone?: string;
	logoUrl?: string;
	isActive?: boolean;
}

export interface IMunicipalityFilterOptions {
	searchTerm?: string;
	country?: string;
	isActive?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
