# CityCare — Digital Municipal Service & Complaint Management Platform

CityCare is an enterprise digital municipal service and complaint management backend platform powered by Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, and Redis.

---

## Phase 15 — Reporting, Dashboard & Analytics

Phase 15 introduces a high-performance reporting and analytics engine designed to provide executive management insights into service request volumes, status breakdowns, SLA performance, department/category distributions, staff workload, ward/zone geographic analytics, request trends, and financial revenues.

---

## Base Path

```text
/api/v1/reports
```

---

## Security & Access Control

- All reporting endpoints require authentication and are restricted to **ADMIN** and **SUPER_ADMIN** roles (`auth(Role.ADMIN, Role.SUPER_ADMIN)`).
- Access control is strictly enforced via JWT and cookie authentication middleware.
- Unauthenticated or non-admin attempts (Citizens/Staff) return `401 Unauthorized` or `403 Forbidden`.

---

## Caching Strategy

- Expensive aggregation queries are cached using **Redis** with a TTL of **60 seconds**.
- Cache keys are generated dynamically based on query parameters (e.g. `report:overview:from=...&to=...`).
- **Resilience**: If Redis is offline or unreachable, system automatically falls back to live PostgreSQL database execution without breaking functionality.

---

## API Endpoints

### 1. Overview Dashboard
```http
GET /api/v1/reports/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
```
- **Access**: Admin / Super Admin
- **Query Params**: `from` (optional), `to` (optional)
- **Response**: Aggregated counts of total requests, pending, in-progress, resolved, closed, rejected, cancelled, SLA breached, total paid services, successful/failed payments, and total revenue.

---

### 2. Request Statistics
```http
GET /api/v1/reports/requests?from=...&to=...&status=...&departmentId=...&categoryId=...&wardId=...&zoneId=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `status`, `departmentId`, `categoryId`, `wardId`, `zoneId`
- **Response**: Total requests count, status distribution, priority distribution, free vs. paid services count, and average resolution time in hours and minutes.

---

### 3. Category Analytics
```http
GET /api/v1/reports/requests/by-category?from=...&to=...&departmentId=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `departmentId`
- **Response**: List of categories with request counts, category code, and department name.

---

### 4. Department Analytics
```http
GET /api/v1/reports/requests/by-department?from=...&to=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`
- **Response**: Department breakdown showing total requests, pending, in-progress, resolved, closed, and SLA breaches per department.

---

### 5. Ward Analytics
```http
GET /api/v1/reports/requests/by-ward?from=...&to=...&zoneId=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `zoneId`
- **Response**: Geographic distribution of requests by Ward, ward number, and parent Zone name.

---

### 6. Zone Analytics
```http
GET /api/v1/reports/requests/by-zone?from=...&to=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`
- **Response**: Geographic distribution of requests by Zone and Municipality name.

---

### 7. Request Trend Analytics
```http
GET /api/v1/reports/requests/trends?from=...&to=...&groupBy=day|week|month
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `groupBy` (default `month`)
- **Response**: Time-series list of periodic request metrics (`period`, `totalRequests`, `resolvedRequests`, `closedRequests`).

---

### 8. Staff Workload Report
```http
GET /api/v1/reports/staff-workload?from=...&to=...&departmentId=...&staffId=...&page=1&limit=10
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `departmentId`, `staffId`, `page`, `limit`
- **Response**: Operational staff metrics including employee ID, staff type, designation, department, assigned requests, accepted assignments, active assignments, completed assignments, and resolution count with pagination metadata.

---

### 9. SLA Performance Report
```http
GET /api/v1/reports/sla?from=...&to=...&departmentId=...&categoryId=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `departmentId`, `categoryId`
- **Response**: SLA metrics including total requests with SLA, completed within SLA, breached, SLA warnings, overall breach percentage, and department-level SLA breakdown.

---

### 10. Payment & Financial Report
```http
GET /api/v1/reports/payments?from=...&to=...&status=...&paymentMethod=...
```
- **Access**: Admin / Super Admin
- **Query Params**: `from`, `to`, `status`, `paymentMethod`
- **Response**: Payment attempt statistics (success, failed, cancelled, refunded, pending), total revenue (using Decimal precision), monthly payment trends, and paid service performance statistics.

---

## Date Range Validation Rules

- `from` and `to` query parameters accept standard ISO date strings (e.g. `2026-01-01` or `2026-01-01T00:00:00.000Z`).
- Date validation enforces `from <= to`. Invalid ranges return `400 Bad Request`.
- Dates supplied as `YYYY-MM-DD` are automatically parsed to end-of-day (`23:59:59.999Z`) for inclusive filtering.
