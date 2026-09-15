import type {
	PaymentStatus,
	RequestStatus,
	ServicePriority,
} from "../../../generated/prisma/enums";

export interface ILocationInput {
	wardId: string;
	address: string;
	area?: string;
	latitude?: number;
	longitude?: number;
}

export interface IAttachmentInput {
	fileUrl: string;
	filePublicId?: string;
	fileName?: string;
	fileType?: string;
	fileSize?: number;
}

export interface ICreateServiceRequestPayload {
	serviceId: string;
	title: string;
	description: string;
	priority?: ServicePriority;
	location: ILocationInput;
	attachments?: IAttachmentInput[];
}

export interface IUpdateServiceRequestPayload {
	title?: string;
	description?: string;
	priority?: ServicePriority;
	location?: Partial<ILocationInput>;
}

export interface IServiceRequestFilterOptions {
	searchTerm?: string;
	status?: RequestStatus;
	serviceId?: string;
	categoryId?: string;
	wardId?: string;
	municipalityId?: string;
	priority?: ServicePriority;
	isPaid?: string;
	paymentStatus?: PaymentStatus;
	startDate?: string;
	endDate?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
