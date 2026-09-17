import type {
	PaymentState,
	RequestStatus,
	ServicePriority,
	StaffType,
} from "../../../generated/prisma/client";

export interface IDateFilter {
	from?: string;
	to?: string;
}

export interface IRequestStatsFilter extends IDateFilter {
	status?: RequestStatus;
	departmentId?: string;
	categoryId?: string;
	wardId?: string;
	zoneId?: string;
}

export interface ICategoryAnalyticsFilter extends IDateFilter {
	departmentId?: string;
}

export interface IDepartmentAnalyticsFilter extends IDateFilter {}

export interface IWardAnalyticsFilter extends IDateFilter {
	zoneId?: string;
}

export interface IZoneAnalyticsFilter extends IDateFilter {}

export interface ITrendAnalyticsFilter extends IDateFilter {
	groupBy?: "day" | "week" | "month";
}

export interface IStaffWorkloadFilter extends IDateFilter {
	departmentId?: string;
	staffId?: string;
}

export interface ISlaReportFilter extends IDateFilter {
	departmentId?: string;
	categoryId?: string;
}

export interface IPaymentReportFilter extends IDateFilter {
	status?: PaymentState;
	paymentMethod?: string;
}

export interface IPaginationOptions {
	page?: number;
	limit?: number;
}

export interface IOverviewDashboardResponse {
	totalRequests: number;
	pendingRequests: number;
	inProgressRequests: number;
	resolvedRequests: number;
	closedRequests: number;
	rejectedRequests: number;
	cancelledRequests: number;
	slaBreached: number;
	totalPaidServices: number;
	successfulPayments: number;
	failedPayments: number;
	totalRevenue: number;
}

export interface IStatusDistributionItem {
	status: RequestStatus;
	count: number;
}

export interface IPriorityDistributionItem {
	priority: ServicePriority;
	count: number;
}

export interface IRequestStatisticsResponse {
	totalRequests: number;
	statusDistribution: IStatusDistributionItem[];
	priorityDistribution: IPriorityDistributionItem[];
	freeVsPaid: {
		freeCount: number;
		paidCount: number;
	};
	averageResolutionTime: {
		averageHours: number;
		averageMinutes: number;
		totalResolvedCountWithDuration: number;
	};
}

export interface ICategoryAnalyticsItem {
	categoryId: string;
	categoryName: string;
	categoryCode: string;
	departmentId: string;
	departmentName: string;
	requestCount: number;
}

export interface IDepartmentAnalyticsItem {
	departmentId: string;
	departmentName: string;
	totalRequests: number;
	pending: number;
	inProgress: number;
	resolved: number;
	closed: number;
	slaBreaches: number;
}

export interface IWardAnalyticsItem {
	wardId: string;
	wardName: string;
	wardNumber: number;
	zoneId: string;
	zoneName: string;
	totalRequests: number;
}

export interface IZoneAnalyticsItem {
	zoneId: string;
	zoneName: string;
	municipalityId: string;
	municipalityName: string;
	totalRequests: number;
}

export interface ITrendAnalyticsItem {
	period: string;
	totalRequests: number;
	resolvedRequests: number;
	closedRequests: number;
}

export interface IStaffWorkloadItem {
	staffId: string;
	employeeId: string;
	userId: string;
	staffName: string;
	email: string;
	designation: string;
	staffType: StaffType;
	departmentId: string;
	departmentName: string;
	assignedRequests: number;
	acceptedAssignments: number;
	activeAssignments: number;
	completedAssignments: number;
	resolutionCount: number;
}

export interface IDepartmentSlaItem {
	departmentId: string;
	departmentName: string;
	totalRequests: number;
	slaBreached: number;
	breachPercentage: number;
}

export interface ISlaReportResponse {
	totalRequestsWithSla: number;
	slaCompleted: number;
	slaBreached: number;
	slaWarning: number;
	breachPercentage: number;
	departmentSlaPerformance: IDepartmentSlaItem[];
}

export interface IPaymentMonthTrendItem {
	period: string;
	totalAttempts: number;
	successfulCount: number;
	revenue: number;
}

export interface IPaidServiceStatItem {
	serviceId: string;
	serviceName: string;
	categoryName: string;
	totalRequests: number;
	totalRevenue: number;
}

export interface IPaymentReportResponse {
	totalPaymentAttempts: number;
	successfulPayments: number;
	failedPayments: number;
	cancelledPayments: number;
	refundedPayments: number;
	pendingPayments: number;
	totalRevenue: number;
	paymentCountByMonth: IPaymentMonthTrendItem[];
	paidServiceStats: IPaidServiceStatItem[];
}
