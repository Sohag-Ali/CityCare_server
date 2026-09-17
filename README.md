# CityCare — Digital Municipal Service & Complaint Management Platform

CityCare is an enterprise-grade, configurable digital municipal service and complaint management backend platform powered by Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, and bKash Payment Gateway. It enables local government entities to model civic complaints, manage municipal staff workloads, automate SLA compliance, process service fees, and generate executive reporting analytics.

> [!NOTE]
> CityCare is a configurable software system for digital civic service administration. It is designed for demonstration and architectural reference and is not an officially deployed government platform.

## [LIVE LINK](https://city-care-beryl.vercel.app)




---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Main Features](#3-main-features)
- [4. Technology Stack](#4-technology-stack)
- [5. Architecture](#5-architecture)
- [6. Project Structure](#6-project-structure)
- [7. User Roles & RBAC](#7-user-roles--rbac)
- [8. Authentication & Authorization](#8-authentication--authorization)
- [9. Database Architecture](#9-database-architecture)
- [10. Service Request Lifecycle](#10-service-request-lifecycle)
- [11. Payment Flow (bKash)](#11-payment-flow-bkash)
- [12. Notification System](#12-notification-system)
- [13. Audit Logging](#13-audit-logging)
- [14. SLA Management & Escalation](#14-sla-management--escalation)
- [15. Reporting & Analytics](#15-reporting--analytics)
- [16. Environment Variables](#16-environment-variables)
- [17. Installation & Setup](#17-installation--setup)
- [18. Database Setup & Seeding](#18-database-setup--seeding)
- [19. Running the Application](#19-running-the-application)
- [20. API Base URL & Documentation](#20-api-base-url--documentation)
- [21. Security & Data Protection](#21-security--data-protection)
- [22. Deployment Architecture](#22-deployment-architecture)
- [23. Future Improvements](#23-future-improvements)

---

## 1. Project Overview

CityCare provides a centralized, transparent digital bridge between citizens and municipal administrations:

- **Citizens** register accounts, submit civic service requests or complaints (e.g. road repairs, waste management, street light issues), upload photo evidence, make digital fee payments via bKash, and track request status in real-time.
- **Municipal Staff** (Officers, Technicians, Managers) receive tasks based on department specialization, update job status, upload progress and resolution proof, and request manager verification.
- **Administrators** (Admins & Super Admins) manage municipal infrastructure (Zones, Wards, Departments, Categories, Services), oversee staff account invitations, manage SLA policies, monitor audit trails, and access real-time performance analytics.

---

## 2. Problem Statement

Municipalities face several operational challenges in traditional civic administration:

- **Manual Complaint Handling**: Paper-based or uncoordinated phone complaints lead to lost reports and delayed response.
- **Lack of Request Tracking**: Citizens cannot track progress, resulting in low public trust and repetitive inquiries.
- **Inefficient Staff Assignment**: Lack of visibility into technician workloads leads to uneven task distribution.
- **SLA Violations**: Without automated response/resolution deadlines, urgent issues remain pending indefinitely.
- **Uncollected Revenue**: Manual fee collection for paid municipal services causes payment leakage.
- **Lack of Auditability**: Absence of tamper-proof action logs makes accountability enforcement difficult.
- **Fragmented Data**: Decision-makers lack unified analytics to evaluate ward performance or category complaint trends.

CityCare addresses these problems through automated workflows, strict Role-Based Access Control (RBAC), timed SLA enforcement, secure digital payment processing, and interactive analytical reporting.

---

## 3. Main Features

The current implementation includes the following core functional modules:

### 🔐 Auth & Identity
- Public Citizen Registration with OTP Email Verification.
- Credential Login & Google OAuth2 Authentication.
- Secure JWT Access (1d) & Refresh Tokens (7d) via HTTP-Only Cookies and Bearer Tokens.
- Two-step Activation flow for Admin and Staff invitations using Redis OTPs.
- Password reset workflow with timed reset tokens.

### 🏢 Municipal Infrastructure Management
- **Municipalities**: Multi-tenancy support for municipal jurisdictions.
- **Zones & Wards**: Hierarchical geographical division (Municipality → Zone → Ward).
- **Departments & Categories**: Functional grouping of civic departments and service categories.
- **Municipal Services**: Free and Paid service catalog with configurable base fees.

### 🛠️ Staff & Role-Based Access Control (RBAC)
- Role Hierarchy: `SUPER_ADMIN` → `ADMIN` → `STAFF` → `CITIZEN`.
- Staff Types: `OFFICER`, `TECHNICIAN`, `MANAGER`.
- Admin-controlled staff profile creation and department linking.
- Protection against privilege escalation and last `SUPER_ADMIN` deactivation block.

### 📋 Service Request Lifecycle
- Citizen request submission with title, description, priority, location (Ward, Address, GPS Coordinates), and multi-file attachments.
- Automated tracking number generation (`SR-YYYY-XXXXX`).
- Admin/Staff review, approval, rejection, cancellation, and escalation.
- Department-restricted technician assignment and acceptance workflow.
- Technician work updates with progress status and before/after proof attachments.
- Two-tier resolution verification (`APPROVED` or `REWORK_REQUIRED`).

### ⏰ Service Level Agreement (SLA) & Escalation
- SLA policies configurable per Department and Category (Response & Resolution deadlines).
- Automated background SLA breach detection.
- SLA event tracking (`WARNING`, `BREACH`, `ESCALATION`).

### 💳 Digital Payments (bKash Sandbox Integration)
- bKash Payment Gateway integration for paid municipal services.
- Server-validated payment initiation (prevents client fee tampering).
- Webhook callback handler (`/api/v1/payments/bkash/callback`).
- Idempotent transaction verification and audit trail logging.

### 🔔 Notifications & Communication
- Real-time in-app notifications and background email dispatching via Nodemailer.
- Status update alerts, assignment notifications, and payment receipts.

### 📊 Executive Reporting & Analytics
- Overview Dashboard (counts, revenues, status distributions).
- Category, Department, Ward, and Zone analytics.
- Time-series request trend analysis (daily, weekly, monthly).
- Staff workload and SLA performance reports.
- Payment & financial revenue breakdowns with Redis query caching (60s TTL).

### 🛡️ Audit Logging
- Immutable audit log capturing action, entity, user IP, user agent, and payload diffs.

---

## 4. Technology Stack

Actual library versions from [`package.json`](file:///e:/LAVEL_2/Assingment/CityCare/package.json):

| Category | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `>=20.x` | JavaScript Server Environment |
| **Language** | TypeScript | `^7.0.2` | Strongly Typed Programming Language |
| **Framework** | Express | `^5.2.1` | Web Application Framework |
| **Database** | PostgreSQL | `^8.22.0` | Relational Database Engine |
| **ORM** | Prisma | `^7.9.1` | Next-Generation ORM with Multi-Schema Support |
| **Cache & Store** | Redis | `^6.2.1` | In-Memory Key-Value Store & OTP Cache |
| **Validation** | Zod | `^4.6.4` | Schema Validation |
| **Authentication** | JSON Web Token (jsonwebtoken) | `^9.0.3` | JWT Access & Refresh Token Management |
| **Security** | bcryptjs | `^3.0.3` | Password Hashing |
| **OAuth** | google-auth-library | `^11.0.2` | Google OAuth2 ID Token Verification |
| **File Storage** | Cloudinary | `^2.11.0` | Media & Attachment Cloud Storage |
| **Multipart** | Multer | `^2.4.0` | File Upload Handling |
| **Email** | Nodemailer | `^10.0.9` | SMTP Email Service Provider |
| **Payments** | bKash API | `v1.2.0-beta` | Tokenized Sandbox Payment Gateway |
| **Linter / Formatter**| Biome | `2.5.13` | Code Quality & Formatting Tool |
| **Execution** | tsx | `^4.23.1` | TypeScript Execution Engine |

---

## 5. Architecture

The system follows a clean modular architectural pattern with strict layer separation:

```text
                                 ┌───────────────────────────┐
                                 │ Client / Postman / Mobile │
                                 └─────────────┬─────────────┘
                                               │ HTTP / REST
                                               ▼
                                 ┌───────────────────────────┐
                                 │       Express API         │
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ checkAuth Middleware (JWT)│
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ Role Guard / RBAC Check   │
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ Zod Validation Middleware │
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ Controller Layer          │
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ Service Layer (Business)  │
                                 └──────┬──────────────┬─────┘
                                        │              │
                   ┌────────────────────▼┐            ┌▼───────────────────┐
                   │ Prisma ORM Client   │            │ Redis Client       │
                   └──────────┬──────────┘            └────────┬───────────┘
                              │                                │
                   ┌──────────▼──────────┐            ┌────────▼───────────┐
                   │ PostgreSQL Database │            │ OTPs & Report Cache│
                   └─────────────────────┘            └────────────────────┘
```

### Supporting Infrastructure Services
- **Cloudinary**: File attachments (complaint photos, completion evidence) uploaded via Multer are streamed to Cloudinary.
- **Nodemailer**: Asynchronous notification worker dispatches verification OTPs and email notifications.
- **bKash Sandbox**: Tokenized REST API for executing digital payments with server-side validation.

---

## 6. Project Structure

```text
CityCare/
├── prisma/
│   ├── migrations/               # PostgreSQL schema migration files
│   └── schema/                   # Prisma multi-schema definitions
│       ├── schema.prisma         # Main Prisma datasource configuration
│       ├── enums.prisma          # Database enums (Role, RequestStatus, etc.)
│       ├── user.prisma           # User model
│       ├── citizen.prisma        # Citizen profile model
│       ├── staff.prisma          # Staff profile model
│       ├── municipality.prisma   # Municipality model
│       ├── zone.prisma           # Zone model
│       ├── ward.prisma           # Ward model
│       ├── department.prisma     # Department model
│       ├── category.prisma       # Category model
│       ├── service.prisma        # MunicipalService model
│       ├── serviceRequest.prisma # ServiceRequest, Location & Attachment models
│       ├── assignment.prisma     # Assignment model
│       ├── technicianUpdate.prisma# Technician update model
│       ├── resolution.prisma     # Resolution submission model
│       ├── resolutionVerification.prisma# Manager verification model
│       ├── slaPolicy.prisma      # SLA Policy model
│       ├── slaEvent.prisma       # SLA Breach/Warning events model
│       ├── escalation.prisma     # Escalation model
│       ├── payment.prisma        # bKash Payment & PaymentEvent models
│       ├── auditLog.prisma       # AuditLog model
│       └── notification.prisma   # Notification model
├── src/
│   ├── app/
│   │   ├── config/               # Environment configuration loader
│   │   ├── interface/            # Global TypeScript interfaces & pagination
│   │   ├── lib/                  # External service clients (Prisma, Redis, Cloudinary, bKash, Nodemailer)
│   │   ├── middleware/           # Auth, RBAC, Validation, Global Error, NotFound
│   │   ├── module/               # Domain Feature Modules
│   │   │   ├── admin/            # Admin management controller/service/route
│   │   │   ├── assignment/       # Technician assignment service & controller
│   │   │   ├── attachment/       # Attachment management service & controller
│   │   │   ├── auditLog/         # Audit log service & controller
│   │   │   ├── auth/             # Authentication service & controller
│   │   │   ├── category/         # Category service & controller
│   │   │   ├── department/       # Department service & controller
│   │   │   ├── municipality/     # Municipality service & controller
│   │   │   ├── notification/     # In-app/email notification queue & worker
│   │   │   ├── payment/          # bKash payment service & callback controller
│   │   │   ├── report/           # Analytics & reporting service & controller
│   │   │   ├── resolutionVerification/# Manager verification controller & service
│   │   │   ├── service/          # Municipal service service & controller
│   │   │   ├── serviceRequest/   # Service request lifecycle service & controller
│   │   │   ├── sla/              # SLA policy service & controller
│   │   │   ├── staff/            # Staff profile service & controller
│   │   │   ├── technicianWork/   # Technician updates & resolution service
│   │   │   ├── user/             # User profile image upload controller
│   │   │   ├── ward/             # Ward service & controller
│   │   │   └── zone/             # Zone service & controller
│   │   └── utils/                # Helper utilities (AppError, sendResponse, seed, jwt)
│   ├── app.ts                    # Express application entry & route mounting
│   └── server.ts                 # HTTP Server bootstrap & DB connection setup
├── .env.example                  # Template for required environment variables
├── biome.json                    # Biome linting & formatting rules
├── package.json                  # NPM dependencies & lifecycle scripts
├── prisma.config.ts              # Prisma CLI configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 7. User Roles & RBAC

The system enforces strict multi-tier Role-Based Access Control (`Role` enum):

```text
SUPER_ADMIN
    │
    ▼
  ADMIN
    │
    ▼
  STAFF ─── (StaffTypes: OFFICER, TECHNICIAN, MANAGER)
    │
    ▼
 CITIZEN
```

### Role Capabilities & Restrictions

| Role | Access Scope & Permissions |
| :--- | :--- |
| `SUPER_ADMIN` | - Complete system oversight.<br>- Create and manage `ADMIN` accounts.<br>- Manage all Municipalities, Zones, Wards, Departments, Categories, Services, SLA policies.<br>- Cannot be created via public registration.<br>- Protected against deactivating the last active `SUPER_ADMIN`. |
| `ADMIN` | - Create and manage `STAFF` accounts.<br>- Manage Zones, Wards, Departments, Categories, Municipal Services.<br>- Assign requests to staff/technicians.<br>- Review, approve, reject, or escalate service requests.<br>- Access complete audit logs and executive analytics reports. |
| `STAFF` | - **OFFICER**: Review service requests, manage assignments.<br>- **TECHNICIAN**: Accept assignments, start work, submit progress updates, and submit resolutions.<br>- **MANAGER**: Perform resolution verifications (`APPROVED` or `REWORK_REQUIRED`).<br>- Restricted to requests within their assigned department. |
| `CITIZEN` | - Create personal profile via registration.<br>- Submit service requests for their ward.<br>- Upload initial evidence attachments.<br>- Initiate and complete bKash fee payments.<br>- View request progress history and notifications. |

---

## 8. Authentication & Authorization

### Authentication Mechanisms
1. **Public Registration (`/api/v1/auth/register`)**:
   - Accepts name, email, password, contact number, address.
   - Forces `Role.CITIZEN`.
   - Sends a 6-digit OTP via email and saves it to Redis (expires in 10 minutes).

2. **Email Verification (`/api/v1/auth/verify-email`)**:
   - Validates email + OTP.
   - Marks `emailVerified = true`.

3. **Admin & Staff Invitation Activation**:
   - `SUPER_ADMIN` creates Admin (`/api/v1/admin/admins`) → System generates OTP in Redis. Admin completes setup via `/api/v1/auth/activate-admin`.
   - `ADMIN` creates Staff (`/api/v1/staff`) → System generates OTP in Redis. Staff completes setup via `/api/v1/auth/staff/activate`.

4. **Credential & Google Login**:
   - Login returns `accessToken` (Bearer token) and sets `refreshToken` in an HTTP-Only secure cookie.
   - `/api/v1/auth/google-login` validates Google ID Token via Google Auth Library.

---

## 9. Database Architecture

### Relationship Overview

```text
Municipality (1) ───< Zone (N) ───< Ward (N) ───< RequestLocation (N)
     │                                                     │
     ├───< Department (N)                                 │
     │        │                                           │
     │        ├───< StaffProfile (N)                      │
     │        │        │                                  │
     │        │        └───< Assignment (N) ──────────────┼───┐
     │        │                                           │   │
     │        └───< Category (N)                          │   │
     │                 │                                  │   │
     │                 └───< MunicipalService (N)         │   │
     │                            │                       │   │
     │                            └───< ServiceRequest (1)│   │
     │                                       │            │   │
     │                                       ├───(1)──────┘   │
     │                                       ├───< (N) Assignment ┘
     │                                       ├───< (N) TechnicianUpdate
     │                                       ├───< (N) Resolution
     │                                       ├───< (N) ResolutionVerification
     │                                       ├───< (N) Payment (bKash)
     │                                       ├───< (N) RequestAttachment
     │                                       └───< (N) SlaEvent
```

---

## 10. Service Request Lifecycle

The system enforces a state machine for service requests (`RequestStatus` enum):

```text
[ Citizen Creates Request ]
           │
           ▼
       SUBMITTED ─────────► CANCELLED (Citizen cancels before review)
           │
           ▼
     UNDER_REVIEW ────────► REJECTED (Admin/Staff rejects invalid request)
           │
           ▼
        APPROVED
           │
           ▼
        ASSIGNED (Technician assigned)
           │
           ▼
        ACCEPTED (Technician accepts assignment)
           │
           ▼
      IN_PROGRESS (Technician starts work)
           │
           ▼
 RESOLUTION_SUBMITTED (Technician uploads resolution evidence)
           │
           ▼
      VERIFICATION ───► REWORK_REQUIRED ───► IN_PROGRESS
           │
           ▼ (Manager Approves Verification)
        RESOLVED
           │
           ▼
         CLOSED
```

---

## 11. Payment Flow (bKash)

For municipal services configured as `isPaid: true`, citizens must complete payment before or during processing:

```text
Citizen Requests Paid Service
            │
            ▼
POST /api/v1/payments/initiate (Server calculates fee from MunicipalService)
            │
            ▼
  Call bKash Create Payment API
            │
            ▼
Return bKash `bkashURL` to Client
            │
            ▼
Citizen Completes Payment on bKash Page
            │
            ▼
Redirect to GET /api/v1/payments/bkash/callback?paymentID=...&status=success
            │
            ▼
Server Calls bKash Execute Payment API
            │
            ▼
Verify Transaction → Update Payment & ServiceRequest Status (`PAID`)
```

---

## 12. Notification System

1. **In-App Notifications**: Stored in `notifications` table (`userId`, `title`, `message`, `type`, `isRead`).
2. **Email Notifications**: Asynchronous background queue using Nodemailer.
3. **Trigger Events**:
   - User Registration OTP
   - Admin/Staff Invitation Activation OTP
   - Service Request Status Change
   - Technician Work Assignment
   - bKash Payment Confirmation

---

## 13. Audit Logging

Every critical data mutation creates an immutable record in the `audit_logs` table:

- **Recorded Fields**: `userId`, `action` (e.g. `CREATE_SERVICE_REQUEST`, `ASSIGN_TECHNICIAN`), `entity` (e.g. `ServiceRequest`), `entityId`, `oldData` (JSON), `newData` (JSON), `ipAddress`, `userAgent`.
- **Append-Only**: Audit logs cannot be updated or deleted via API.

---

## 14. SLA Management & Escalation

- **SLA Policy (`SlaPolicy`)**: Configured per Department or Category with `responseHours` and `resolutionHours`.
- **Deadline Calculation**: On request submission, system automatically calculates `responseDueAt` and `resolutionDueAt`.
- **Events & Warnings**: If a request exceeds its deadline without reaching resolution, system logs an `SlaEvent` (`BREACH`) and flags the request as `ESCALATED`.

---

## 15. Reporting & Analytics

All reporting APIs (`/api/v1/reports/*`) are cached using Redis (60-second TTL):

1. **Overview Dashboard** (`/reports/overview`): Total counts, status breakdown, SLA breach totals, and financial revenue.
2. **Request Statistics** (`/reports/requests`): Detailed metrics with priority and paid vs. free breakdown.
3. **Category / Department / Ward / Zone Analytics**: Multi-dimensional request volume aggregations.
4. **Time-Series Trends** (`/reports/requests/trends`): Grouped by `day`, `week`, or `month`.
5. **Staff Workload Report** (`/reports/staff-workload`): Task completion, active assignments, and completion efficiency per technician.
6. **SLA Compliance Report** (`/reports/sla`): Breach percentage and average resolution times.
7. **Payment & Financial Report** (`/reports/payments`): Transaction success rate, total revenue, and monthly trends.

---

## 16. Environment Variables

Create a `.env` file in the root directory following `.env.example`:

| Variable | Purpose | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP Port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_ACCESS_SECRET` | Secret key for Access Token | `your_access_secret_key` |
| `JWT_REFRESH_SECRET` | Secret key for Refresh Token | `your_refresh_secret_key` |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `1d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | `10` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |
| `SUPER_ADMIN_NAME` | Initial Super Admin name | `Super Admin` |
| `SUPER_ADMIN_EMAIL` | Initial Super Admin email | `superadmin@citycare.gov.bd` |
| `SUPER_ADMIN_PASSWORD` | Initial Super Admin password | `SuperAdmin@123!` |
| `ADMIN_NAME` | Initial Tester Admin name | `Tester Admin` |
| `ADMIN_EMAIL` | Initial Tester Admin email | `admin@citycare.gov.bd` |
| `ADMIN_PASSWORD` | Initial Tester Admin password | `TesterAdmin@123!` |
| `REDIS_HOST` | Redis Server Host | `127.0.0.1` |
| `REDIS_PORT` | Redis Server Port | `6379` |
| `REDIS_USER` | Redis Username | `default` |
| `REDIS_PASSWORD` | Redis Password | `redis_password` |
| `SMTP_USER` | SMTP Email | `noreply@citycare.gov.bd` |
| `SMTP_PASSWORD` | SMTP Email Password / App Secret | `smtp_password` |
| `EMAIL_SENDER` | Sender Email Header | `noreply@citycare.gov.bd` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` |
| `BKASH_BASE_URL` | bKash Sandbox Gateway URL | `https://tokenized.sandbox.bka.sh/v1.2.0-beta` |
| `BKASH_USERNAME` | bKash Merchant Username | `sandboxTokenizedUser` |
| `BKASH_PASSWORD` | bKash Merchant Password | `sandboxPassword` |
| `BKASH_APP_KEY` | bKash App Key | `sandboxAppKey` |
| `BKASH_APP_SECRET` | bKash App Secret | `sandboxAppSecret` |
| `BKASH_CALLBACK_URL` | bKash Callback Endpoint | `http://localhost:5000/api/v1/payments/bkash/callback` |

---

## 17. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sohag-Ali/CityCare_server.git
   cd CityCare
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your database, Redis, SMTP, Cloudinary, and bKash credentials:
   ```bash
   cp .env.example .env
   ```

---

## 18. Database Setup & Seeding

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Run Migrations**:
   ```bash
   npx prisma migrate dev
   ```

3. **Automatic Initial Account Seeding**:
   When you start the development server, `src/server.ts` automatically seeds the initial `SUPER_ADMIN` and `ADMIN` accounts specified in your `.env` file if they do not already exist.

---

## 19. Running the Application

- **Development Mode** (with automatic reload via `tsx`):
  ```bash
  npm run dev
  ```

- **Check Linter & Formatter** (using Biome):
  ```bash
  npm run check
  ```

- **Build for Production**:
  ```bash
  npm run build
  ```

- **Start Production Server**:
  ```bash
  npm start
  ```

---

## 20. API Base URL & Documentation

- **Base Endpoint**: `http://localhost:5000/api/v1`
- **Complete Postman API Testing Guide**: Refer to [`POSTMAN_API_DOCUMENTATION.md`](file:///e:/LAVEL_2/Assingment/CityCare/POSTMAN_API_DOCUMENTATION.md) for step-by-step instructions, environment setup, end-to-end request flows, and expected response payloads.

---

## 21. Security & Data Protection

- **Password Security**: Passwords hashed using `bcryptjs` with salt rounds = 10.
- **Strict Role-Based Access Control**: Route-level access enforcement via `auth(...)` middleware.
- **JWT Protection**: Short-lived Access Tokens (1d) and Refresh Tokens (7d) stored in HTTP-Only cookies.
- **Input Sanitation & Schema Validation**: Strict request body validation via Zod schemas.
- **Fee Protection**: Server calculates fee amounts directly from `MunicipalService` database records; client-submitted payment amounts are strictly ignored.
- **CORS Protection**: Access restricted to specified `FRONTEND_URL`.

---

## 22. Deployment Architecture

CityCare backend requires the following managed runtime components for production deployment:

- **Node.js Application Server**: Deployed on platforms like AWS EC2, DigitalOcean, or Render.
- **Managed PostgreSQL**: Neon PostgreSQL or AWS RDS.
- **Managed Redis**: Redis Cloud or AWS ElastiCache.
- **Cloud Media Storage**: Cloudinary for file attachments.
- **SMTP Gateway**: SendGrid, AWS SES, or Gmail SMTP.
- **bKash Tokenized REST API**: Production merchant credentials configured in `.env`.

---

## 23. Future Improvements

The following items are planned for future engineering iterations:

- **Frontend Client**: Next.js 14 web application for Citizens and Municipal Admins.
- **Mobile Application**: Flutter mobile application for field technicians.
- **SMS Notifications**: Integration with local SMS gateways (e.g. Teletalk / Grameenphone SMS API).
- **GIS Map Viewer**: Interactive OpenStreetMap / Mapbox visualization for complaint clusters.
- **Multi-language Support**: Native English and Bengali language localization.
