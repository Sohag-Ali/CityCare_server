import httpStatus from "http-status";
import z from "zod";
import { PaymentState, RequestStatus } from "../../../generated/prisma/client";
import { AppError } from "../../utils/AppError";

const dateStringSchema = z
	.string()
	.refine((val) => !Number.isNaN(Date.parse(val)), {
		message: "Invalid ISO date string",
	})
	.optional();

export const overviewQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
});

export const requestsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	status: z.nativeEnum(RequestStatus).optional(),
	departmentId: z.string().uuid("Invalid departmentId UUID").optional(),
	categoryId: z.string().uuid("Invalid categoryId UUID").optional(),
	wardId: z.string().uuid("Invalid wardId UUID").optional(),
	zoneId: z.string().uuid("Invalid zoneId UUID").optional(),
});

export const categoryAnalyticsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	departmentId: z.string().uuid("Invalid departmentId UUID").optional(),
});

export const departmentAnalyticsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
});

export const wardAnalyticsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	zoneId: z.string().uuid("Invalid zoneId UUID").optional(),
});

export const zoneAnalyticsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
});

export const trendAnalyticsQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	groupBy: z.enum(["day", "week", "month"]).optional(),
});

export const staffWorkloadQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	departmentId: z.string().uuid("Invalid departmentId UUID").optional(),
	staffId: z.string().uuid("Invalid staffId UUID").optional(),
	page: z.string().optional(),
	limit: z.string().optional(),
});

export const slaReportQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	departmentId: z.string().uuid("Invalid departmentId UUID").optional(),
	categoryId: z.string().uuid("Invalid categoryId UUID").optional(),
});

export const paymentReportQuerySchema = z.object({
	from: dateStringSchema,
	to: dateStringSchema,
	status: z.nativeEnum(PaymentState).optional(),
	paymentMethod: z.string().optional(),
});

/**
 * Validates and parses ISO date range strings into Date objects.
 * Handles inclusive 'to' dates (YYYY-MM-DD set to 23:59:59.999Z).
 */
export const parseReportDateRange = (
	from?: string,
	to?: string,
): { fromDate?: Date; toDate?: Date } => {
	let fromDate: Date | undefined;
	let toDate: Date | undefined;

	if (from) {
		fromDate = new Date(from);
		if (Number.isNaN(fromDate.getTime())) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Invalid 'from' date format. Must be a valid ISO date string.",
			);
		}
	}

	if (to) {
		if (/^\d{4}-\d{2}-\d{2}$/.test(to.trim())) {
			toDate = new Date(`${to.trim()}T23:59:59.999Z`);
		} else {
			toDate = new Date(to);
		}

		if (Number.isNaN(toDate.getTime())) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Invalid 'to' date format. Must be a valid ISO date string.",
			);
		}
	}

	if (fromDate && toDate && fromDate > toDate) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invalid date range: 'from' date must be before or equal to 'to' date.",
		);
	}

	return { fromDate, toDate };
};

export const ReportValidation = {
	overviewQuerySchema,
	requestsQuerySchema,
	categoryAnalyticsQuerySchema,
	departmentAnalyticsQuerySchema,
	wardAnalyticsQuerySchema,
	zoneAnalyticsQuerySchema,
	trendAnalyticsQuerySchema,
	staffWorkloadQuerySchema,
	slaReportQuerySchema,
	paymentReportQuerySchema,
	parseReportDateRange,
};
