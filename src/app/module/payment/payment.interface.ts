export interface IInitiatePaymentPayload {
	serviceRequestId: string;
}

export interface IPaymentFilterOptions {
	status?: string;
	serviceRequestId?: string;
	startDate?: string;
	endDate?: string;
	searchTerm?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
