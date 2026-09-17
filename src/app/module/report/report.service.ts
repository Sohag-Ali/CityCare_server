import type { Prisma } from "../../../generated/prisma/client";
import {
	AssignmentStatus,
	PaymentState,
	RequestStatus,
	ServicePriority,
	SlaEventType,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { REPORT_CACHE_KEYS, REPORT_CACHE_TTL } from "./report.constant";
import type {
	ICategoryAnalyticsFilter,
	ICategoryAnalyticsItem,
	IDepartmentAnalyticsFilter,
	IDepartmentAnalyticsItem,
	IOverviewDashboardResponse,
	IPaginationOptions,
	IPaidServiceStatItem,
	IPaymentMonthTrendItem,
	IPaymentReportFilter,
	IPaymentReportResponse,
	IPriorityDistributionItem,
	IRequestStatisticsResponse,
	IRequestStatsFilter,
	ISlaReportFilter,
	ISlaReportResponse,
	IStaffWorkloadFilter,
	IStaffWorkloadItem,
	IStatusDistributionItem,
	ITrendAnalyticsFilter,
	ITrendAnalyticsItem,
	IWardAnalyticsFilter,
	IWardAnalyticsItem,
	IZoneAnalyticsFilter,
	IZoneAnalyticsItem,
} from "./report.interface";
import { parseReportDateRange } from "./report.validation";

/**
 * Graceful cache retrieval helper
 */
const getFromCache = async <T>(key: string): Promise<T | null> => {
	try {
		if (redisClient.isOpen) {
			const cached = await redisClient.get(key);
			if (cached) {
				return JSON.parse(cached) as T;
			}
		}
	} catch (_err) {
		// Fallback to PostgreSQL gracefully
	}
	return null;
};

/**
 * Graceful cache storage helper
 */
const setInCache = async <T>(
	key: string,
	value: T,
	ttl = REPORT_CACHE_TTL,
): Promise<void> => {
	try {
		if (redisClient.isOpen) {
			await redisClient.set(key, JSON.stringify(value), { EX: ttl });
		}
	} catch (_err) {
		// Ignore Redis errors gracefully
	}
};

/**
 * Generate unique cache key from query parameters
 */
const generateCacheKey = (
	prefix: string,
	filters: Record<string, any>,
): string => {
	const sortedQuery = Object.keys(filters)
		.sort()
		.filter((k) => filters[k] !== undefined && filters[k] !== null)
		.map((k) => `${k}=${String(filters[k])}`)
		.join("&");
	return `${prefix}:${sortedQuery || "all"}`;
};

// Overview Dashboard
const getOverviewDashboard = async (filters: {
	from?: string;
	to?: string;
}): Promise<IOverviewDashboardResponse> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.OVERVIEW, filters);
	const cachedData = await getFromCache<IOverviewDashboardResponse>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const requestDateFilter: Prisma.ServiceRequestWhereInput = {
		isDeleted: false,
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
	};

	const paymentDateFilter: Prisma.PaymentWhereInput = {
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
	};

	const pendingStatuses: RequestStatus[] = [
		RequestStatus.SUBMITTED,
		RequestStatus.UNDER_REVIEW,
	];

	const inProgressStatuses: RequestStatus[] = [
		RequestStatus.APPROVED,
		RequestStatus.ASSIGNED,
		RequestStatus.ACCEPTED,
		RequestStatus.IN_PROGRESS,
		RequestStatus.RESOLUTION_SUBMITTED,
		RequestStatus.VERIFICATION,
		RequestStatus.ESCALATED,
	];

	const [
		totalRequests,
		pendingRequests,
		inProgressRequests,
		resolvedRequests,
		closedRequests,
		rejectedRequests,
		cancelledRequests,
		slaBreached,
		totalPaidServices,
		successfulPayments,
		failedPayments,
		revenueAgg,
	] = await Promise.all([
		prisma.serviceRequest.count({ where: requestDateFilter }),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: { in: pendingStatuses } },
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: { in: inProgressStatuses } },
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: RequestStatus.RESOLVED },
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: RequestStatus.CLOSED },
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: RequestStatus.REJECTED },
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, status: RequestStatus.CANCELLED },
		}),
		prisma.serviceRequest.count({
			where: {
				...requestDateFilter,
				slaEvents: { some: { type: SlaEventType.BREACH } },
			},
		}),
		prisma.serviceRequest.count({
			where: { ...requestDateFilter, isPaid: true },
		}),
		prisma.payment.count({
			where: { ...paymentDateFilter, status: PaymentState.SUCCESS },
		}),
		prisma.payment.count({
			where: { ...paymentDateFilter, status: PaymentState.FAILED },
		}),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: { ...paymentDateFilter, status: PaymentState.SUCCESS },
		}),
	]);

	const totalRevenue = revenueAgg._sum.amount
		? Number(revenueAgg._sum.amount)
		: 0;

	const response: IOverviewDashboardResponse = {
		totalRequests,
		pendingRequests,
		inProgressRequests,
		resolvedRequests,
		closedRequests,
		rejectedRequests,
		cancelledRequests,
		slaBreached,
		totalPaidServices,
		successfulPayments,
		failedPayments,
		totalRevenue,
	};

	await setInCache(cacheKey, response);
	return response;
};

// Request Statistics
const getRequestStatistics = async (
	filters: IRequestStatsFilter,
): Promise<IRequestStatisticsResponse> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.REQUESTS, filters);
	const cachedData = await getFromCache<IRequestStatisticsResponse>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const where: Prisma.ServiceRequestWhereInput = {
		isDeleted: false,
		...(filters.status ? { status: filters.status } : {}),
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
		...(filters.categoryId || filters.departmentId
			? {
					service: {
						...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
						...(filters.departmentId
							? { category: { departmentId: filters.departmentId } }
							: {}),
					},
				}
			: {}),
		...(filters.wardId || filters.zoneId
			? {
					location: {
						...(filters.wardId ? { wardId: filters.wardId } : {}),
						...(filters.zoneId ? { ward: { zoneId: filters.zoneId } } : {}),
					},
				}
			: {}),
	};

	const [
		totalRequests,
		statusGroup,
		priorityGroup,
		freeCount,
		paidCount,
		resolvedRequests,
	] = await Promise.all([
		prisma.serviceRequest.count({ where }),
		prisma.serviceRequest.groupBy({
			by: ["status"],
			_count: { _all: true },
			where,
		}),
		prisma.serviceRequest.groupBy({
			by: ["priority"],
			_count: { _all: true },
			where,
		}),
		prisma.serviceRequest.count({ where: { ...where, isPaid: false } }),
		prisma.serviceRequest.count({ where: { ...where, isPaid: true } }),
		prisma.serviceRequest.findMany({
			where: {
				...where,
				resolutionCompletedAt: { not: null },
			},
			select: {
				createdAt: true,
				resolutionCompletedAt: true,
			},
		}),
	]);

	const statusDistribution: IStatusDistributionItem[] = statusGroup.map(
		(sg) => ({
			status: sg.status,
			count: sg._count._all,
		}),
	);

	const priorityDistribution: IPriorityDistributionItem[] = priorityGroup.map(
		(pg) => ({
			priority: pg.priority,
			count: pg._count._all,
		}),
	);

	let totalDurationMs = 0;
	let validDurationCount = 0;

	for (const req of resolvedRequests) {
		if (req.resolutionCompletedAt) {
			const diff =
				req.resolutionCompletedAt.getTime() - req.createdAt.getTime();
			if (diff >= 0) {
				totalDurationMs += diff;
				validDurationCount += 1;
			}
		}
	}

	const avgHours =
		validDurationCount > 0
			? Number(
					(totalDurationMs / (1000 * 60 * 60 * validDurationCount)).toFixed(2),
				)
			: 0;

	const avgMinutes =
		validDurationCount > 0
			? Number((totalDurationMs / (1000 * 60 * validDurationCount)).toFixed(2))
			: 0;

	const response: IRequestStatisticsResponse = {
		totalRequests,
		statusDistribution,
		priorityDistribution,
		freeVsPaid: {
			freeCount,
			paidCount,
		},
		averageResolutionTime: {
			averageHours: avgHours,
			averageMinutes: avgMinutes,
			totalResolvedCountWithDuration: validDurationCount,
		},
	};

	await setInCache(cacheKey, response);
	return response;
};

// Category Analytics
const getCategoryAnalytics = async (
	filters: ICategoryAnalyticsFilter,
): Promise<ICategoryAnalyticsItem[]> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.BY_CATEGORY, filters);
	const cachedData = await getFromCache<ICategoryAnalyticsItem[]>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const categories = await prisma.category.findMany({
		where: {
			isDeleted: false,
			isActive: true,
			...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
		},
		include: {
			department: {
				select: { id: true, name: true },
			},
			services: {
				where: { isDeleted: false },
				select: {
					id: true,
					serviceRequests: {
						where: {
							isDeleted: false,
							...(fromDate || toDate
								? {
										createdAt: {
											...(fromDate ? { gte: fromDate } : {}),
											...(toDate ? { lte: toDate } : {}),
										},
									}
								: {}),
						},
						select: { id: true },
					},
				},
			},
		},
	});

	const response: ICategoryAnalyticsItem[] = categories.map((cat) => {
		const requestCount = cat.services.reduce(
			(sum, s) => sum + s.serviceRequests.length,
			0,
		);
		return {
			categoryId: cat.id,
			categoryName: cat.name,
			categoryCode: cat.code,
			departmentId: cat.departmentId,
			departmentName: cat.department.name,
			requestCount,
		};
	});

	response.sort((a, b) => b.requestCount - a.requestCount);

	await setInCache(cacheKey, response);
	return response;
};

// Department Analytics
const getDepartmentAnalytics = async (
	filters: IDepartmentAnalyticsFilter,
): Promise<IDepartmentAnalyticsItem[]> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.BY_DEPARTMENT, filters);
	const cachedData = await getFromCache<IDepartmentAnalyticsItem[]>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const departments = await prisma.department.findMany({
		where: { isDeleted: false, isActive: true },
		select: { id: true, name: true },
	});

	const pendingStatuses: RequestStatus[] = [
		RequestStatus.SUBMITTED,
		RequestStatus.UNDER_REVIEW,
	];

	const inProgressStatuses: RequestStatus[] = [
		RequestStatus.APPROVED,
		RequestStatus.ASSIGNED,
		RequestStatus.ACCEPTED,
		RequestStatus.IN_PROGRESS,
		RequestStatus.RESOLUTION_SUBMITTED,
		RequestStatus.VERIFICATION,
		RequestStatus.ESCALATED,
	];

	const dateFilter: Prisma.ServiceRequestWhereInput = {
		isDeleted: false,
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
	};

	const response: IDepartmentAnalyticsItem[] = await Promise.all(
		departments.map(async (dept) => {
			const deptRequestWhere: Prisma.ServiceRequestWhereInput = {
				...dateFilter,
				service: {
					category: { departmentId: dept.id },
				},
			};

			const [
				totalRequests,
				pending,
				inProgress,
				resolved,
				closed,
				slaBreaches,
			] = await Promise.all([
				prisma.serviceRequest.count({ where: deptRequestWhere }),
				prisma.serviceRequest.count({
					where: { ...deptRequestWhere, status: { in: pendingStatuses } },
				}),
				prisma.serviceRequest.count({
					where: { ...deptRequestWhere, status: { in: inProgressStatuses } },
				}),
				prisma.serviceRequest.count({
					where: { ...deptRequestWhere, status: RequestStatus.RESOLVED },
				}),
				prisma.serviceRequest.count({
					where: { ...deptRequestWhere, status: RequestStatus.CLOSED },
				}),
				prisma.serviceRequest.count({
					where: {
						...deptRequestWhere,
						slaEvents: { some: { type: SlaEventType.BREACH } },
					},
				}),
			]);

			return {
				departmentId: dept.id,
				departmentName: dept.name,
				totalRequests,
				pending,
				inProgress,
				resolved,
				closed,
				slaBreaches,
			};
		}),
	);

	response.sort((a, b) => b.totalRequests - a.totalRequests);

	await setInCache(cacheKey, response);
	return response;
};

// Ward Analytics
const getWardAnalytics = async (
	filters: IWardAnalyticsFilter,
): Promise<IWardAnalyticsItem[]> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.BY_WARD, filters);
	const cachedData = await getFromCache<IWardAnalyticsItem[]>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const wards = await prisma.ward.findMany({
		where: {
			isDeleted: false,
			isActive: true,
			...(filters.zoneId ? { zoneId: filters.zoneId } : {}),
		},
		include: {
			zone: { select: { id: true, name: true } },
			requestLocations: {
				where: {
					serviceRequest: {
						isDeleted: false,
						...(fromDate || toDate
							? {
									createdAt: {
										...(fromDate ? { gte: fromDate } : {}),
										...(toDate ? { lte: toDate } : {}),
									},
								}
							: {}),
					},
				},
				select: { id: true },
			},
		},
	});

	const response: IWardAnalyticsItem[] = wards.map((w) => ({
		wardId: w.id,
		wardName: w.name,
		wardNumber: w.wardNumber,
		zoneId: w.zoneId,
		zoneName: w.zone.name,
		totalRequests: w.requestLocations.length,
	}));

	response.sort((a, b) => b.totalRequests - a.totalRequests);

	await setInCache(cacheKey, response);
	return response;
};

// Zone Analytics
const getZoneAnalytics = async (
	filters: IZoneAnalyticsFilter,
): Promise<IZoneAnalyticsItem[]> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.BY_ZONE, filters);
	const cachedData = await getFromCache<IZoneAnalyticsItem[]>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const zones = await prisma.zone.findMany({
		where: { isDeleted: false, isActive: true },
		include: {
			municipality: { select: { id: true, name: true } },
			wards: {
				where: { isDeleted: false },
				include: {
					requestLocations: {
						where: {
							serviceRequest: {
								isDeleted: false,
								...(fromDate || toDate
									? {
											createdAt: {
												...(fromDate ? { gte: fromDate } : {}),
												...(toDate ? { lte: toDate } : {}),
											},
										}
									: {}),
							},
						},
						select: { id: true },
					},
				},
			},
		},
	});

	const response: IZoneAnalyticsItem[] = zones.map((z) => {
		const totalRequests = z.wards.reduce(
			(sum, w) => sum + w.requestLocations.length,
			0,
		);
		return {
			zoneId: z.id,
			zoneName: z.name,
			municipalityId: z.municipalityId,
			municipalityName: z.municipality.name,
			totalRequests,
		};
	});

	response.sort((a, b) => b.totalRequests - a.totalRequests);

	await setInCache(cacheKey, response);
	return response;
};

// Request Trends
const getRequestTrends = async (
	filters: ITrendAnalyticsFilter,
): Promise<ITrendAnalyticsItem[]> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.TRENDS, filters);
	const cachedData = await getFromCache<ITrendAnalyticsItem[]>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);
	const groupBy = filters.groupBy || "month";

	const requests = await prisma.serviceRequest.findMany({
		where: {
			isDeleted: false,
			...(fromDate || toDate
				? {
						createdAt: {
							...(fromDate ? { gte: fromDate } : {}),
							...(toDate ? { lte: toDate } : {}),
						},
					}
				: {}),
		},
		select: {
			createdAt: true,
			status: true,
		},
	});

	const groupedMap = new Map<
		string,
		{ totalRequests: number; resolvedRequests: number; closedRequests: number }
	>();

	const getPeriodKey = (
		date: Date,
		group: "day" | "week" | "month",
	): string => {
		const y = date.getUTCFullYear();
		const m = String(date.getUTCMonth() + 1).padStart(2, "0");
		const d = String(date.getUTCDate()).padStart(2, "0");

		if (group === "day") {
			return `${y}-${m}-${d}`;
		}
		if (group === "month") {
			return `${y}-${m}`;
		}
		// week grouping: start of week (Sunday or Monday)
		const dayOfWeek = date.getUTCDay();
		const startOfWeek = new Date(date);
		startOfWeek.setUTCDate(date.getUTCDate() - dayOfWeek);
		const wy = startOfWeek.getUTCFullYear();
		const wm = String(startOfWeek.getUTCMonth() + 1).padStart(2, "0");
		const wd = String(startOfWeek.getUTCDate()).padStart(2, "0");
		return `Week of ${wy}-${wm}-${wd}`;
	};

	for (const req of requests) {
		const period = getPeriodKey(req.createdAt, groupBy);
		const existing = groupedMap.get(period) || {
			totalRequests: 0,
			resolvedRequests: 0,
			closedRequests: 0,
		};

		existing.totalRequests += 1;
		if (req.status === RequestStatus.RESOLVED) {
			existing.resolvedRequests += 1;
		}
		if (req.status === RequestStatus.CLOSED) {
			existing.closedRequests += 1;
		}

		groupedMap.set(period, existing);
	}

	const response: ITrendAnalyticsItem[] = Array.from(groupedMap.entries())
		.map(([period, counts]) => ({
			period,
			totalRequests: counts.totalRequests,
			resolvedRequests: counts.resolvedRequests,
			closedRequests: counts.closedRequests,
		}))
		.sort((a, b) => a.period.localeCompare(b.period));

	await setInCache(cacheKey, response);
	return response;
};

// Staff Workload
const getStaffWorkload = async (
	filters: IStaffWorkloadFilter,
	pagination: IPaginationOptions,
): Promise<{
	meta: { page: number; limit: number; total: number; totalPages: number };
	data: IStaffWorkloadItem[];
}> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.STAFF_WORKLOAD, {
		...filters,
		...pagination,
	});
	const cachedData = await getFromCache<{
		meta: { page: number; limit: number; total: number; totalPages: number };
		data: IStaffWorkloadItem[];
	}>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const page = Number(pagination.page) > 0 ? Number(pagination.page) : 1;
	const limit = Number(pagination.limit) > 0 ? Number(pagination.limit) : 10;
	const skip = (page - 1) * limit;

	const staffWhere: Prisma.StaffProfileWhereInput = {
		isDeleted: false,
		isActive: true,
		...(filters.staffId ? { id: filters.staffId } : {}),
		...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
	};

	const [total, staffProfiles] = await Promise.all([
		prisma.staffProfile.count({ where: staffWhere }),
		prisma.staffProfile.findMany({
			where: staffWhere,
			skip,
			take: limit,
			include: {
				user: { select: { id: true, name: true, email: true } },
				department: { select: { id: true, name: true } },
			},
		}),
	]);

	const dateFilterAssignment: Prisma.AssignmentWhereInput = {
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
	};

	const data: IStaffWorkloadItem[] = await Promise.all(
		staffProfiles.map(async (staff) => {
			const [
				assignedRequests,
				acceptedAssignments,
				activeAssignments,
				completedAssignments,
				resolutionCount,
			] = await Promise.all([
				prisma.assignment.count({
					where: { technicianId: staff.id, ...dateFilterAssignment },
				}),
				prisma.assignment.count({
					where: {
						technicianId: staff.id,
						status: AssignmentStatus.ACCEPTED,
						...dateFilterAssignment,
					},
				}),
				prisma.assignment.count({
					where: {
						technicianId: staff.id,
						status: AssignmentStatus.ACTIVE,
						...dateFilterAssignment,
					},
				}),
				prisma.assignment.count({
					where: {
						technicianId: staff.id,
						serviceRequest: {
							status: {
								in: [RequestStatus.RESOLVED, RequestStatus.CLOSED],
							},
						},
						...dateFilterAssignment,
					},
				}),
				prisma.resolution.count({
					where: {
						submittedById: staff.userId,
						...(fromDate || toDate
							? {
									createdAt: {
										...(fromDate ? { gte: fromDate } : {}),
										...(toDate ? { lte: toDate } : {}),
									},
								}
							: {}),
					},
				}),
			]);

			return {
				staffId: staff.id,
				employeeId: staff.employeeId,
				userId: staff.userId,
				staffName: staff.user.name,
				email: staff.user.email,
				designation: staff.designation,
				staffType: staff.staffType,
				departmentId: staff.departmentId,
				departmentName: staff.department.name,
				assignedRequests,
				acceptedAssignments,
				activeAssignments,
				completedAssignments,
				resolutionCount,
			};
		}),
	);

	const totalPages = Math.ceil(total / limit);
	const response = {
		meta: {
			page,
			limit,
			total,
			totalPages,
		},
		data,
	};

	await setInCache(cacheKey, response);
	return response;
};

// SLA Report
const getSlaReport = async (
	filters: ISlaReportFilter,
): Promise<ISlaReportResponse> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.SLA, filters);
	const cachedData = await getFromCache<ISlaReportResponse>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const requestWhere: Prisma.ServiceRequestWhereInput = {
		isDeleted: false,
		OR: [{ responseDueAt: { not: null } }, { resolutionDueAt: { not: null } }],
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
		...(filters.categoryId || filters.departmentId
			? {
					service: {
						...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
						...(filters.departmentId
							? { category: { departmentId: filters.departmentId } }
							: {}),
					},
				}
			: {}),
	};

	const requestsWithSla = await prisma.serviceRequest.findMany({
		where: requestWhere,
		select: {
			id: true,
			responseDueAt: true,
			resolutionDueAt: true,
			resolutionCompletedAt: true,
			service: {
				select: {
					category: {
						select: {
							department: {
								select: { id: true, name: true },
							},
						},
					},
				},
			},
			slaEvents: {
				select: { type: true },
			},
		},
	});

	const totalRequestsWithSla = requestsWithSla.length;
	let slaCompleted = 0;
	let slaBreached = 0;
	let slaWarning = 0;

	const deptMap = new Map<
		string,
		{ departmentName: string; totalRequests: number; slaBreached: number }
	>();

	for (const req of requestsWithSla) {
		const deptId = req.service.category.department.id;
		const deptName = req.service.category.department.name;

		const existingDept = deptMap.get(deptId) || {
			departmentName: deptName,
			totalRequests: 0,
			slaBreached: 0,
		};
		existingDept.totalRequests += 1;

		const hasBreachEvent = req.slaEvents.some(
			(e) => e.type === SlaEventType.BREACH,
		);
		const hasWarningEvent = req.slaEvents.some(
			(e) => e.type === SlaEventType.WARNING,
		);
		if (hasWarningEvent) slaWarning += 1;

		let isBreached = false;
		if (hasBreachEvent) {
			isBreached = true;
		} else if (req.resolutionDueAt) {
			if (
				req.resolutionCompletedAt &&
				req.resolutionCompletedAt > req.resolutionDueAt
			) {
				isBreached = true;
			} else if (
				!req.resolutionCompletedAt &&
				new Date() > req.resolutionDueAt
			) {
				isBreached = true;
			}
		}

		if (isBreached) {
			slaBreached += 1;
			existingDept.slaBreached += 1;
		} else if (
			req.resolutionCompletedAt &&
			req.resolutionDueAt &&
			req.resolutionCompletedAt <= req.resolutionDueAt
		) {
			slaCompleted += 1;
		}

		deptMap.set(deptId, existingDept);
	}

	const breachPercentage =
		totalRequestsWithSla > 0
			? Number(((slaBreached / totalRequestsWithSla) * 100).toFixed(2))
			: 0;

	const departmentSlaPerformance = Array.from(deptMap.entries()).map(
		([deptId, d]) => ({
			departmentId: deptId,
			departmentName: d.departmentName,
			totalRequests: d.totalRequests,
			slaBreached: d.slaBreached,
			breachPercentage:
				d.totalRequests > 0
					? Number(((d.slaBreached / d.totalRequests) * 100).toFixed(2))
					: 0,
		}),
	);

	const response: ISlaReportResponse = {
		totalRequestsWithSla,
		slaCompleted,
		slaBreached,
		slaWarning,
		breachPercentage,
		departmentSlaPerformance,
	};

	await setInCache(cacheKey, response);
	return response;
};

// Payment Report
const getPaymentReport = async (
	filters: IPaymentReportFilter,
): Promise<IPaymentReportResponse> => {
	const cacheKey = generateCacheKey(REPORT_CACHE_KEYS.PAYMENTS, filters);
	const cachedData = await getFromCache<IPaymentReportResponse>(cacheKey);
	if (cachedData) return cachedData;

	const { fromDate, toDate } = parseReportDateRange(filters.from, filters.to);

	const paymentWhere: Prisma.PaymentWhereInput = {
		...(filters.status ? { status: filters.status } : {}),
		...(filters.paymentMethod
			? {
					paymentMethod: { equals: filters.paymentMethod, mode: "insensitive" },
				}
			: {}),
		...(fromDate || toDate
			? {
					createdAt: {
						...(fromDate ? { gte: fromDate } : {}),
						...(toDate ? { lte: toDate } : {}),
					},
				}
			: {}),
	};

	const [
		totalPaymentAttempts,
		successfulPayments,
		failedPayments,
		cancelledPayments,
		refundedPayments,
		pendingPayments,
		totalRevenueAgg,
		allPayments,
	] = await Promise.all([
		prisma.payment.count({ where: paymentWhere }),
		prisma.payment.count({
			where: { ...paymentWhere, status: PaymentState.SUCCESS },
		}),
		prisma.payment.count({
			where: { ...paymentWhere, status: PaymentState.FAILED },
		}),
		prisma.payment.count({
			where: { ...paymentWhere, status: PaymentState.CANCELLED },
		}),
		prisma.payment.count({
			where: { ...paymentWhere, status: PaymentState.REFUNDED },
		}),
		prisma.payment.count({
			where: { ...paymentWhere, status: PaymentState.PENDING },
		}),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: { ...paymentWhere, status: PaymentState.SUCCESS },
		}),
		prisma.payment.findMany({
			where: paymentWhere,
			select: {
				amount: true,
				status: true,
				createdAt: true,
				serviceRequest: {
					select: {
						service: {
							select: {
								id: true,
								name: true,
								category: { select: { name: true } },
							},
						},
					},
				},
			},
		}),
	]);

	const totalRevenue = totalRevenueAgg._sum.amount
		? Number(totalRevenueAgg._sum.amount)
		: 0;

	// Payment trends by month
	const monthTrendMap = new Map<
		string,
		{ totalAttempts: number; successfulCount: number; revenue: number }
	>();
	// Paid service stats map
	const paidServiceMap = new Map<
		string,
		{
			serviceName: string;
			categoryName: string;
			totalRequests: number;
			totalRevenue: number;
		}
	>();

	for (const p of allPayments) {
		const y = p.createdAt.getUTCFullYear();
		const m = String(p.createdAt.getUTCMonth() + 1).padStart(2, "0");
		const period = `${y}-${m}`;

		const existingMonth = monthTrendMap.get(period) || {
			totalAttempts: 0,
			successfulCount: 0,
			revenue: 0,
		};
		existingMonth.totalAttempts += 1;
		if (p.status === PaymentState.SUCCESS) {
			existingMonth.successfulCount += 1;
			existingMonth.revenue += Number(p.amount);
		}
		monthTrendMap.set(period, existingMonth);

		if (p.serviceRequest?.service) {
			const s = p.serviceRequest.service;
			const existingService = paidServiceMap.get(s.id) || {
				serviceName: s.name,
				categoryName: s.category.name,
				totalRequests: 0,
				totalRevenue: 0,
			};
			existingService.totalRequests += 1;
			if (p.status === PaymentState.SUCCESS) {
				existingService.totalRevenue += Number(p.amount);
			}
			paidServiceMap.set(s.id, existingService);
		}
	}

	const paymentCountByMonth: IPaymentMonthTrendItem[] = Array.from(
		monthTrendMap.entries(),
	)
		.map(([period, data]) => ({
			period,
			totalAttempts: data.totalAttempts,
			successfulCount: data.successfulCount,
			revenue: Number(data.revenue.toFixed(2)),
		}))
		.sort((a, b) => a.period.localeCompare(b.period));

	const paidServiceStats: IPaidServiceStatItem[] = Array.from(
		paidServiceMap.entries(),
	)
		.map(([serviceId, data]) => ({
			serviceId,
			serviceName: data.serviceName,
			categoryName: data.categoryName,
			totalRequests: data.totalRequests,
			totalRevenue: Number(data.totalRevenue.toFixed(2)),
		}))
		.sort((a, b) => b.totalRevenue - a.totalRevenue);

	const response: IPaymentReportResponse = {
		totalPaymentAttempts,
		successfulPayments,
		failedPayments,
		cancelledPayments,
		refundedPayments,
		pendingPayments,
		totalRevenue,
		paymentCountByMonth,
		paidServiceStats,
	};

	await setInCache(cacheKey, response);
	return response;
};

export const ReportService = {
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
