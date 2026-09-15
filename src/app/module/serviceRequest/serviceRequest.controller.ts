import type { Request, Response } from "express";
import httpStatus from "http-status";
import type {
	PaymentStatus,
	RequestStatus,
	Role,
	ServicePriority,
} from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IPaginationOptions,
	IServiceRequestFilterOptions,
} from "./serviceRequest.interface";
import { ServiceRequestService } from "./serviceRequest.service";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;

	let payload = req.body;
	if (typeof req.body.data === "string") {
		try {
			payload = JSON.parse(req.body.data);
		} catch {
			// keep original body if parsing fails
		}
	}

	const files = req.files as Express.Multer.File[] | undefined;

	const result = await ServiceRequestService.createServiceRequest(
		authUserId,
		payload,
		files,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service request submitted successfully",
		data: result,
	});
});

const getAllServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const authRole = req.user?.role as Role;
		const authUserId = req.user?.userId as string;

		const {
			page,
			limit,
			sortBy,
			sortOrder,
			searchTerm,
			status,
			serviceId,
			categoryId,
			wardId,
			municipalityId,
			priority,
			isPaid,
			paymentStatus,
			startDate,
			endDate,
		} = req.query;

		const filters: IServiceRequestFilterOptions = {
			searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
			status:
				typeof status === "string" ? (status as RequestStatus) : undefined,
			serviceId: typeof serviceId === "string" ? serviceId : undefined,
			categoryId: typeof categoryId === "string" ? categoryId : undefined,
			wardId: typeof wardId === "string" ? wardId : undefined,
			municipalityId:
				typeof municipalityId === "string" ? municipalityId : undefined,
			priority:
				typeof priority === "string"
					? (priority as ServicePriority)
					: undefined,
			isPaid: typeof isPaid === "string" ? isPaid : undefined,
			paymentStatus:
				typeof paymentStatus === "string"
					? (paymentStatus as PaymentStatus)
					: undefined,
			startDate: typeof startDate === "string" ? startDate : undefined,
			endDate: typeof endDate === "string" ? endDate : undefined,
		};

		const sortOrderVal: "asc" | "desc" | undefined =
			sortOrder === "asc" || sortOrder === "desc"
				? (sortOrder as "asc" | "desc")
				: undefined;

		const options: IPaginationOptions = {
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
			sortBy: typeof sortBy === "string" ? sortBy : undefined,
			sortOrder: sortOrderVal,
		};

		const result = await ServiceRequestService.getAllServiceRequests(
			authRole,
			authUserId,
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service requests fetched successfully",
			meta: result.meta,
			data: result.data,
		});
	},
);

const getMyServiceRequests = catchAsync(async (req: Request, res: Response) => {
	const authUserId = req.user?.userId as string;

	const {
		page,
		limit,
		sortBy,
		sortOrder,
		searchTerm,
		status,
		serviceId,
		categoryId,
		wardId,
		municipalityId,
		priority,
		isPaid,
		paymentStatus,
		startDate,
		endDate,
	} = req.query;

	const filters: IServiceRequestFilterOptions = {
		searchTerm: typeof searchTerm === "string" ? searchTerm : undefined,
		status: typeof status === "string" ? (status as RequestStatus) : undefined,
		serviceId: typeof serviceId === "string" ? serviceId : undefined,
		categoryId: typeof categoryId === "string" ? categoryId : undefined,
		wardId: typeof wardId === "string" ? wardId : undefined,
		municipalityId:
			typeof municipalityId === "string" ? municipalityId : undefined,
		priority:
			typeof priority === "string" ? (priority as ServicePriority) : undefined,
		isPaid: typeof isPaid === "string" ? isPaid : undefined,
		paymentStatus:
			typeof paymentStatus === "string"
				? (paymentStatus as PaymentStatus)
				: undefined,
		startDate: typeof startDate === "string" ? startDate : undefined,
		endDate: typeof endDate === "string" ? endDate : undefined,
	};

	const sortOrderVal: "asc" | "desc" | undefined =
		sortOrder === "asc" || sortOrder === "desc"
			? (sortOrder as "asc" | "desc")
			: undefined;

	const options: IPaginationOptions = {
		page: page ? Number(page) : undefined,
		limit: limit ? Number(limit) : undefined,
		sortBy: typeof sortBy === "string" ? sortBy : undefined,
		sortOrder: sortOrderVal,
	};

	const result = await ServiceRequestService.getMyServiceRequests(
		authUserId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My service requests fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getServiceRequestById = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const authRole = req.user?.role as Role;
		const authUserId = req.user?.userId as string;

		const result = await ServiceRequestService.getServiceRequestById(
			id,
			authRole,
			authUserId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service request fetched successfully",
			data: result,
		});
	},
);

const updateServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const authUserId = req.user?.userId as string;

	const result = await ServiceRequestService.updateServiceRequest(
		id,
		authUserId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service request updated successfully",
		data: result,
	});
});

const updateServiceRequestStatus = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const authRole = req.user?.role as Role;
		const authUserId = req.user?.userId as string;

		const result = await ServiceRequestService.updateServiceRequestStatus(
			id,
			authRole,
			authUserId,
			req.body,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service request status updated successfully",
			data: result,
		});
	},
);

const getServiceRequestHistory = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const authRole = req.user?.role as Role;
		const authUserId = req.user?.userId as string;

		const result = await ServiceRequestService.getServiceRequestHistory(
			id,
			authRole,
			authUserId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service request status history fetched successfully",
			data: result,
		});
	},
);

const cancelServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const authUserId = req.user?.userId as string;

	const result = await ServiceRequestService.cancelServiceRequest(
		id,
		authUserId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service request cancelled successfully",
		data: result,
	});
});

export const ServiceRequestController = {
	createServiceRequest,
	getAllServiceRequests,
	getMyServiceRequests,
	getServiceRequestById,
	updateServiceRequest,
	updateServiceRequestStatus,
	getServiceRequestHistory,
	cancelServiceRequest,
};
