import type { Request, Response } from "express";
import httpStatus from "http-status";
import type {
	PaymentState,
	RequestStatus,
} from "../../../generated/prisma/client";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICategoryAnalyticsFilter,
	IDepartmentAnalyticsFilter,
	IPaginationOptions,
	IPaymentReportFilter,
	IRequestStatsFilter,
	ISlaReportFilter,
	IStaffWorkloadFilter,
	ITrendAnalyticsFilter,
	IWardAnalyticsFilter,
	IZoneAnalyticsFilter,
} from "./report.interface";
import { ReportService } from "./report.service";

const getOverviewDashboard = catchAsync(async (req: Request, res: Response) => {
	const { from, to } = req.query;
	const result = await ReportService.getOverviewDashboard({
		from: from as string,
		to: to as string,
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Overview dashboard metrics retrieved successfully",
		data: result,
	});
});

const getRequestStatistics = catchAsync(async (req: Request, res: Response) => {
	const { from, to, status, departmentId, categoryId, wardId, zoneId } =
		req.query;
	const filters: IRequestStatsFilter = {
		from: from as string,
		to: to as string,
		status: status as RequestStatus,
		departmentId: departmentId as string,
		categoryId: categoryId as string,
		wardId: wardId as string,
		zoneId: zoneId as string,
	};

	const result = await ReportService.getRequestStatistics(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request statistics retrieved successfully",
		data: result,
	});
});

const getCategoryAnalytics = catchAsync(async (req: Request, res: Response) => {
	const { from, to, departmentId } = req.query;
	const filters: ICategoryAnalyticsFilter = {
		from: from as string,
		to: to as string,
		departmentId: departmentId as string,
	};

	const result = await ReportService.getCategoryAnalytics(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category analytics retrieved successfully",
		data: result,
	});
});

const getDepartmentAnalytics = catchAsync(
	async (req: Request, res: Response) => {
		const { from, to } = req.query;
		const filters: IDepartmentAnalyticsFilter = {
			from: from as string,
			to: to as string,
		};

		const result = await ReportService.getDepartmentAnalytics(filters);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department analytics retrieved successfully",
			data: result,
		});
	},
);

const getWardAnalytics = catchAsync(async (req: Request, res: Response) => {
	const { from, to, zoneId } = req.query;
	const filters: IWardAnalyticsFilter = {
		from: from as string,
		to: to as string,
		zoneId: zoneId as string,
	};

	const result = await ReportService.getWardAnalytics(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ward analytics retrieved successfully",
		data: result,
	});
});

const getZoneAnalytics = catchAsync(async (req: Request, res: Response) => {
	const { from, to } = req.query;
	const filters: IZoneAnalyticsFilter = {
		from: from as string,
		to: to as string,
	};

	const result = await ReportService.getZoneAnalytics(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone analytics retrieved successfully",
		data: result,
	});
});

const getRequestTrends = catchAsync(async (req: Request, res: Response) => {
	const { from, to, groupBy } = req.query;
	const filters: ITrendAnalyticsFilter = {
		from: from as string,
		to: to as string,
		groupBy: groupBy as "day" | "week" | "month",
	};

	const result = await ReportService.getRequestTrends(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request trend analytics retrieved successfully",
		data: result,
	});
});

const getStaffWorkload = catchAsync(async (req: Request, res: Response) => {
	const { from, to, departmentId, staffId, page, limit } = req.query;
	const filters: IStaffWorkloadFilter = {
		from: from as string,
		to: to as string,
		departmentId: departmentId as string,
		staffId: staffId as string,
	};

	const pagination: IPaginationOptions = {
		page: page ? Number(page) : 1,
		limit: limit ? Number(limit) : 10,
	};

	const result = await ReportService.getStaffWorkload(filters, pagination);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff workload report retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getSlaReport = catchAsync(async (req: Request, res: Response) => {
	const { from, to, departmentId, categoryId } = req.query;
	const filters: ISlaReportFilter = {
		from: from as string,
		to: to as string,
		departmentId: departmentId as string,
		categoryId: categoryId as string,
	};

	const result = await ReportService.getSlaReport(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "SLA performance report retrieved successfully",
		data: result,
	});
});

const getPaymentReport = catchAsync(async (req: Request, res: Response) => {
	const { from, to, status, paymentMethod } = req.query;
	const filters: IPaymentReportFilter = {
		from: from as string,
		to: to as string,
		status: status as PaymentState,
		paymentMethod: paymentMethod as string,
	};

	const result = await ReportService.getPaymentReport(filters);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment analytics report retrieved successfully",
		data: result,
	});
});

export const ReportController = {
	getOverviewDashboard,
	getRequestStatistics,
	getCategoryAnalytics,
	getDepartmentAnalytics,
	getWardAnalytics,
	getZoneAnalytics,
	getRequestTrends,
	getStaffWorkload,
	getSlaReport,
	getPaymentReport,
};
