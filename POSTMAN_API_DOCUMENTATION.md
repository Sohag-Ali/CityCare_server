# CityCare — Postman API Documentation & Testing Guide

This guide provides step-by-step instructions for testing all REST APIs in the **CityCare — Digital Municipal Service & Complaint Management Platform** using Postman.

All endpoints, request schemas, parameters, role permissions, and expected response payloads are documented based strictly on the current backend implementation.

---

## Table of Contents

- [1. Complete API Index](#1-complete-api-index)
- [2. Postman Setup & Environment Variables](#2-postman-setup--environment-variables)
- [3. End-to-End Testing Flow](#3-end-to-end-testing-flow)
- [4. API Reference by Module](#4-api-reference-by-module)
  - [4.1 Authentication](#41-authentication)
  - [4.2 Admin Management](#42-admin-management)
  - [4.3 User Profile](#43-user-profile)
  - [4.4 Staff Management](#44-staff-management)
  - [4.5 Municipalities](#45-municipalities)
  - [4.6 Zones](#46-zones)
  - [4.7 Wards](#47-wards)
  - [4.8 Departments](#48-departments)
  - [4.9 Categories](#49-categories)
  - [4.10 Municipal Services](#410-municipal-services)
  - [4.11 Service Requests](#411-service-requests)
  - [4.12 Assignments](#412-assignments)
  - [4.13 SLA Policies](#413-sla-policies)
  - [4.14 Digital Payments (bKash)](#414-digital-payments-bkash)
  - [4.15 Audit Logs](#415-audit-logs)
  - [4.16 Notifications](#416-notifications)
  - [4.17 Executive Reports & Analytics](#417-executive-reports--analytics)
- [5. RBAC Security Negative Tests](#5-rbac-security-negative-tests)
- [6. Validation & Error Handling Tests](#6-validation--error-handling-tests)
- [7. File Upload Testing Instructions](#7-file-upload-testing-instructions)
- [8. Pagination, Filtering & Search Examples](#8-pagination-filtering--search-examples)

---

## 1. Complete API Index

| Method | Endpoint | Allowed Roles | Purpose |
| :--- | :--- | :--- | :--- |
| **AUTH** | | | |
| `POST` | `/api/v1/auth/register` | Public | Register a new Citizen account |
| `POST` | `/api/v1/auth/verify-email` | Public | Verify Citizen email via Redis OTP |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & get access token |
| `GET` | `/api/v1/auth/me` | All Authenticated | Get current logged-in profile |
| `POST` | `/api/v1/auth/google-login` | Public | Authenticate via Google ID Token |
| `POST` | `/api/v1/auth/refresh-token` | Public / Cookie | Get new Access Token via Refresh Token |
| `POST` | `/api/v1/auth/forgot-password` | Public | Send password reset token email |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password using token |
| `POST` | `/api/v1/auth/activate-admin` | Public | Activate Admin account via Redis OTP |
| `POST` | `/api/v1/auth/staff/activate` | Public | Activate Staff account via Redis OTP |
| **ADMIN** | | | |
| `POST` | `/api/v1/admin/admins` | `SUPER_ADMIN` | Create an Admin account |
| `GET` | `/api/v1/admin/admins` | `SUPER_ADMIN` | Get paginated list of Admins |
| `GET` | `/api/v1/admin/admins/:id` | `SUPER_ADMIN` | Get Admin details by ID |
| `PATCH` | `/api/v1/admin/admins/:id` | `SUPER_ADMIN` | Update Admin profile |
| `PATCH` | `/api/v1/admin/admins/:id/activate` | `SUPER_ADMIN` | Activate Admin account status |
| `PATCH` | `/api/v1/admin/admins/:id/deactivate`| `SUPER_ADMIN` | Deactivate Admin status |
| `POST` | `/api/v1/admin/staff` | `ADMIN` | Alias to create Staff profile |
| **USER** | | | |
| `PATCH` | `/api/v1/user/profile-image` | All Authenticated | Upload user profile image |
| **MUNICIPALITY** | | | |
| `POST` | `/api/v1/municipalities` | `ADMIN`, `SUPER_ADMIN` | Create a Municipality |
| `GET` | `/api/v1/municipalities` | `ADMIN`, `SUPER_ADMIN` | List all Municipalities |
| `GET` | `/api/v1/municipalities/:id` | `ADMIN`, `SUPER_ADMIN` | Get Municipality by ID |
| `PATCH` | `/api/v1/municipalities/:id` | `ADMIN`, `SUPER_ADMIN` | Update Municipality |
| `DELETE` | `/api/v1/municipalities/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Municipality |
| **ZONE** | | | |
| `POST` | `/api/v1/zones` | `ADMIN`, `SUPER_ADMIN` | Create a Zone under Municipality |
| `GET` | `/api/v1/zones` | `ADMIN`, `SUPER_ADMIN` | List all Zones |
| `GET` | `/api/v1/zones/:id` | `ADMIN`, `SUPER_ADMIN` | Get Zone by ID |
| `PATCH` | `/api/v1/zones/:id` | `ADMIN`, `SUPER_ADMIN` | Update Zone |
| `DELETE` | `/api/v1/zones/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Zone |
| **WARD** | | | |
| `POST` | `/api/v1/wards` | `ADMIN`, `SUPER_ADMIN` | Create a Ward under Zone |
| `GET` | `/api/v1/wards` | `ADMIN`, `SUPER_ADMIN` | List all Wards |
| `GET` | `/api/v1/wards/:id` | `ADMIN`, `SUPER_ADMIN` | Get Ward by ID |
| `PATCH` | `/api/v1/wards/:id` | `ADMIN`, `SUPER_ADMIN` | Update Ward |
| `DELETE` | `/api/v1/wards/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Ward |
| **DEPARTMENT** | | | |
| `POST` | `/api/v1/departments` | `ADMIN`, `SUPER_ADMIN` | Create a Department |
| `GET` | `/api/v1/departments` | `ADMIN`, `SUPER_ADMIN` | List all Departments |
| `GET` | `/api/v1/departments/:id` | `ADMIN`, `SUPER_ADMIN` | Get Department by ID |
| `PATCH` | `/api/v1/departments/:id` | `ADMIN`, `SUPER_ADMIN` | Update Department |
| `DELETE` | `/api/v1/departments/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Department |
| **STAFF** | | | |
| `POST` | `/api/v1/staff` | `ADMIN` | Create Staff profile & User |
| `GET` | `/api/v1/staff` | `ADMIN`, `SUPER_ADMIN` | List all Staff profiles |
| `GET` | `/api/v1/staff/technicians` | `ADMIN`, `SUPER_ADMIN`, `STAFF` | Get technicians for assignment |
| `GET` | `/api/v1/staff/:id` | `ADMIN`, `SUPER_ADMIN` | Get Staff profile by ID |
| `PATCH` | `/api/v1/staff/:id` | `ADMIN` | Update Staff profile |
| `DELETE` | `/api/v1/staff/:id` | `ADMIN` | Delete Staff profile |
| **CATEGORY** | | | |
| `POST` | `/api/v1/categories` | `ADMIN`, `SUPER_ADMIN` | Create Service Category |
| `GET` | `/api/v1/categories` | All Authenticated | List all Service Categories |
| `GET` | `/api/v1/categories/:id` | All Authenticated | Get Category by ID |
| `PATCH` | `/api/v1/categories/:id` | `ADMIN`, `SUPER_ADMIN` | Update Service Category |
| `DELETE` | `/api/v1/categories/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Category |
| **SERVICE** | | | |
| `POST` | `/api/v1/services` | `ADMIN`, `SUPER_ADMIN` | Create Municipal Service |
| `GET` | `/api/v1/services` | All Authenticated | List all Municipal Services |
| `GET` | `/api/v1/services/:id` | All Authenticated | Get Municipal Service by ID |
| `PATCH` | `/api/v1/services/:id` | `ADMIN`, `SUPER_ADMIN` | Update Municipal Service |
| `DELETE` | `/api/v1/services/:id` | `ADMIN`, `SUPER_ADMIN` | Delete Municipal Service |
| **SERVICE REQUEST** | | | |
| `POST` | `/api/v1/service-requests` | `CITIZEN` | Submit service request (Multipart) |
| `GET` | `/api/v1/service-requests/my` | `CITIZEN` | Get citizen's own requests |
| `GET` | `/api/v1/service-requests` | All Authenticated | List all service requests |
| `GET` | `/api/v1/service-requests/:id` | All Authenticated | Get request details by ID |
| `PATCH` | `/api/v1/service-requests/:id` | `CITIZEN` | Update pending request |
| `PATCH` | `/api/v1/service-requests/:id/status`| All Authenticated | Transition request status |
| `DELETE` | `/api/v1/service-requests/:id` | `CITIZEN` | Cancel request |
| `POST` | `/api/v1/service-requests/:id/assign` | `ADMIN`, `SUPER_ADMIN`, `STAFF` | Assign technician to request |
| `PATCH` | `/api/v1/service-requests/:id/start` | `STAFF` | Technician starts work |
| `POST` | `/api/v1/service-requests/:id/updates` | `STAFF` | Post technician work update |
| `GET` | `/api/v1/service-requests/:id/updates` | All Authenticated | List technician work updates |
| `POST` | `/api/v1/service-requests/:id/resolution` | `STAFF` | Submit resolution proof |
| `GET` | `/api/v1/service-requests/:id/resolution` | All Authenticated | View request resolution |
| `POST` | `/api/v1/service-requests/:id/attachments` | All Authenticated | Add attachments to request |
| `GET` | `/api/v1/service-requests/:id/attachments` | All Authenticated | View request attachments |
| `DELETE` | `/api/v1/service-requests/:id/attachments/:attachmentId` | All Authenticated | Delete single attachment |
| `POST` | `/api/v1/service-requests/:id/evidence` | `STAFF` | Upload resolution evidence |
| `POST` | `/api/v1/service-requests/:id/verify` | `ADMIN`, `SUPER_ADMIN`, `STAFF` | Manager verification |
| `GET` | `/api/v1/service-requests/:id/sla` | All Authenticated | View request SLA status |
| `GET` | `/api/v1/service-requests/:id/history` | All Authenticated | View status change history |
| **ASSIGNMENT** | | | |
| `GET` | `/api/v1/assignments/my` | `STAFF` | Technician's active assignments |
| `PATCH` | `/api/v1/assignments/:id/accept` | `STAFF` | Accept or reject assignment |
| **SLA POLICY** | | | |
| `GET` | `/api/v1/sla-policies` | All Authenticated | List all SLA policies |
| `POST` | `/api/v1/sla-policies` | `ADMIN`, `SUPER_ADMIN` | Create SLA policy |
| `PATCH` | `/api/v1/sla-policies/:id` | `ADMIN`, `SUPER_ADMIN` | Update SLA policy |
| **PAYMENT** | | | |
| `POST` | `/api/v1/payments/initiate` | `CITIZEN` | Initiate bKash fee payment |
| `GET` | `/api/v1/payments/bkash/callback` | Public | bKash callback handler |
| `GET` | `/api/v1/payments/my` | `CITIZEN` | Citizen payment history |
| `GET` | `/api/v1/payments/:id` | `CITIZEN`, `ADMIN`, `SUPER_ADMIN` | Get payment details by ID |
| **AUDIT LOGS** | | | |
| `GET` | `/api/v1/audit-logs` | `ADMIN`, `SUPER_ADMIN` | View paginated audit logs |
| `GET` | `/api/v1/audit-logs/:id` | `ADMIN`, `SUPER_ADMIN` | View audit log details by ID |
| **NOTIFICATIONS** | | | |
| `GET` | `/api/v1/notifications` | All Authenticated | View user notifications |
| `GET` | `/api/v1/notifications/unread-count` | All Authenticated | Get unread notifications count |
| `PATCH` | `/api/v1/notifications/read-all` | All Authenticated | Mark all notifications as read |
| `PATCH` | `/api/v1/notifications/:id/read` | All Authenticated | Mark single notification read |
| **REPORTS** | | | |
| `GET` | `/api/v1/reports/overview` | `ADMIN`, `SUPER_ADMIN` | Executive dashboard overview |
| `GET` | `/api/v1/reports/requests` | `ADMIN`, `SUPER_ADMIN` | Request statistics breakdown |
| `GET` | `/api/v1/reports/requests/by-category` | `ADMIN`, `SUPER_ADMIN` | Category analytics |
| `GET` | `/api/v1/reports/requests/by-department` | `ADMIN`, `SUPER_ADMIN` | Department analytics |
| `GET` | `/api/v1/reports/requests/by-ward` | `ADMIN`, `SUPER_ADMIN` | Ward analytics |
| `GET` | `/api/v1/reports/requests/by-zone` | `ADMIN`, `SUPER_ADMIN` | Zone analytics |
| `GET` | `/api/v1/reports/requests/trends` | `ADMIN`, `SUPER_ADMIN` | Time-series request trends |
| `GET` | `/api/v1/reports/staff-workload` | `ADMIN`, `SUPER_ADMIN` | Staff workload performance |
| `GET` | `/api/v1/reports/sla` | `ADMIN`, `SUPER_ADMIN` | SLA compliance report |
| `GET` | `/api/v1/reports/payments` | `ADMIN`, `SUPER_ADMIN` | Financial revenue report |

---

## 2. Postman Setup & Environment Variables

In Postman, create an Environment named `CityCare Local` and add the following variables:

```text
BASE_URL               http://localhost:5000/api/v1
SUPER_ADMIN_TOKEN      <set after Super Admin login>
ADMIN_TOKEN            <set after Admin login>
STAFF_TOKEN            <set after Staff/Technician login>
CITIZEN_TOKEN          <set after Citizen login>
MUNICIPALITY_ID        <copy from Municipality create response>
ZONE_ID                <copy from Zone create response>
WARD_ID                <copy from Ward create response>
DEPARTMENT_ID          <copy from Department create response>
CATEGORY_ID            <copy from Category create response>
SERVICE_ID             <copy from Service create response>
REQUEST_ID             <copy from Service Request create response>
ASSIGNMENT_ID          <copy from Assign response>
PAYMENT_ID             <copy from Payment Initiate response>
```

---

## 3. End-to-End Testing Flow

Execute requests in the following sequence for clean end-to-end testing:

```text
STEP 01: Login as SUPER_ADMIN (/auth/login using credentials from .env)
STEP 02: Create Municipality (/municipalities)
STEP 03: Create Zone under Municipality (/zones)
STEP 04: Create Ward under Zone (/wards)
STEP 05: Create Department under Municipality (/departments)
STEP 06: Create Category under Department (/categories)
STEP 07: Create Free & Paid Municipal Services (/services)
STEP 08: Create ADMIN Account (/admin/admins) → Retrieve OTP from Redis
STEP 09: Activate ADMIN Account (/auth/activate-admin)
STEP 10: Login as ADMIN (/auth/login)
STEP 11: Create STAFF Account (/staff or /admin/staff) → Retrieve OTP from Redis
STEP 12: Activate STAFF Account (/auth/staff/activate)
STEP 13: Login as STAFF (/auth/login)
STEP 14: Register Citizen Account (/auth/register) → Retrieve OTP from Redis
STEP 15: Verify Citizen Email (/auth/verify-email)
STEP 16: Login as CITIZEN (/auth/login)
STEP 17: Submit Service Request as Citizen (/service-requests)
STEP 18: Initiate bKash Payment if paid service (/payments/initiate)
STEP 19: Assign Technician as Admin (/service-requests/:id/assign)
STEP 20: View My Assignments as Technician (/assignments/my)
STEP 21: Accept Assignment as Technician (/assignments/:id/accept)
STEP 22: Start Work as Technician (/service-requests/:id/start)
STEP 23: Post Progress Update (/service-requests/:id/updates)
STEP 24: Submit Resolution Proof (/service-requests/:id/resolution)
STEP 25: Verify Resolution as Manager/Admin (/service-requests/:id/verify)
STEP 26: View Request Audit History (/service-requests/:id/history)
STEP 27: Check Notifications (/notifications)
STEP 28: View Executive Analytics Reports (/reports/overview, /reports/payments)
```

---

## 4. API Reference by Module

### 4.1 Authentication

#### 1. Citizen Registration
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/register`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "Tanvir Hossain",
    "email": "tanvir.citizen@example.com",
    "password": "CitizenPassword123!",
    "contactNumber": "01711223344",
    "address": "House 12, Road 4, Sector 3, Uttara",
    "gender": "MALE",
    "age": 28
  }
  ```
- **Expected Status**: `201 Created`
- **Response**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Citizen registered successfully. Please verify your email using the OTP sent.",
    "data": {
      "id": "c1a2b3c4-1111-4222-8333-d4e5f6a7b8c9",
      "email": "tanvir.citizen@example.com",
      "role": "CITIZEN"
    }
  }
  ```

#### 2. Verify Citizen Email
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/verify-email`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "tanvir.citizen@example.com",
    "otp": "123456"
  }
  ```
- **Expected Status**: `200 OK`

#### 3. User Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "superadmin1@gmail.com",
    "password": "Super_admin@1"
  }
  ```
- **Expected Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User logged in successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "needPasswordChange": false
    }
  }
  ```

---

### 4.2 Admin Management

#### 1. Create Admin (`SUPER_ADMIN` only)
- **Method**: `POST`
- **Endpoint**: `/api/v1/admin/admins`
- **Auth**: Required (`SUPER_ADMIN`)
- **Headers**: `Authorization: Bearer {{SUPER_ADMIN_TOKEN}}`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "Shafiqul Islam",
    "email": "shafiq.admin@citycare.gov.bd",
    "contactNumber": "01819001122",
    "designation": "Deputy Municipal Officer"
  }
  ```
- **Expected Status**: `201 Created`

#### 2. Activate Admin Account
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/activate-admin`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "shafiq.admin@citycare.gov.bd",
    "otp": "654321",
    "password": "AdminPassword123!"
  }
  ```
- **Expected Status**: `200 OK`

---

### 4.4 Staff Management

#### 1. Create Staff Profile (`ADMIN` only)
- **Method**: `POST`
- **Endpoint**: `/api/v1/staff`
- **Auth**: Required (`ADMIN`)
- **Headers**: `Authorization: Bearer {{ADMIN_TOKEN}}`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "Kamrul Hassan",
    "email": "kamrul.tech@citycare.gov.bd",
    "employeeId": "EMP-2026-001",
    "departmentId": "{{DEPARTMENT_ID}}",
    "staffType": "TECHNICIAN",
    "designation": "Senior Electrical Technician",
    "joiningDate": "2026-01-15T00:00:00.000Z",
    "contactNumber": "01911998877"
  }
  ```
- **Expected Status**: `201 Created`

---

### 4.10 Municipal Services

#### 1. Create Municipal Service
- **Method**: `POST`
- **Endpoint**: `/api/v1/services`
- **Auth**: Required (`ADMIN`, `SUPER_ADMIN`)
- **Headers**: `Authorization: Bearer {{ADMIN_TOKEN}}`, `Content-Type: application/json`
- **Body (Paid Service)**:
  ```json
  {
    "categoryId": "{{CATEGORY_ID}}",
    "name": "Bulk Debris Waste Removal",
    "code": "BULK-WASTE-01",
    "description": "Removal of heavy commercial or construction debris",
    "isPaid": true,
    "baseFee": 1500.00,
    "currency": "BDT"
  }
  ```
- **Expected Status**: `201 Created`

---

### 4.11 Service Requests

#### 1. Submit Service Request (`CITIZEN` only)
- **Method**: `POST`
- **Endpoint**: `/api/v1/service-requests`
- **Auth**: Required (`CITIZEN`)
- **Headers**: `Authorization: Bearer {{CITIZEN_TOKEN}}`, `Content-Type: multipart/form-data`
- **Form Data Fields**:
  - `files`: File attachments (image/jpeg, image/png, application/pdf - max 5 files)
  - `data`: JSON String:
    ```json
    {
      "serviceId": "{{SERVICE_ID}}",
      "title": "Overflowing Garbage Dumpster on Road 4",
      "description": "The main waste container has been overflowing for 3 days blocking traffic.",
      "priority": "HIGH",
      "wardId": "{{WARD_ID}}",
      "address": "House 12, Road 4, Sector 3, Uttara",
      "area": "Uttara Sector 3",
      "latitude": 23.8745,
      "longitude": 90.3984
    }
    ```
- **Expected Status**: `201 Created`
- **Response**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Service Request submitted successfully",
    "data": {
      "id": "sr-1001-2026",
      "trackingNumber": "SR-2026-00001",
      "status": "SUBMITTED",
      "priority": "HIGH",
      "isPaid": true,
      "amount": "1500.00",
      "paymentStatus": "PENDING"
    }
  }
  ```

#### 2. Assign Technician (`ADMIN` / `STAFF`)
- **Method**: `POST`
- **Endpoint**: `/api/v1/service-requests/{{REQUEST_ID}}/assign`
- **Auth**: Required (`ADMIN`, `SUPER_ADMIN`, `STAFF`)
- **Headers**: `Authorization: Bearer {{ADMIN_TOKEN}}`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "technicianId": "{{STAFF_ID}}",
    "note": "Assigned to primary field electrical team"
  }
  ```
- **Expected Status**: `200 OK`

---

### 4.14 Digital Payments (bKash)

#### 1. Initiate bKash Payment
- **Method**: `POST`
- **Endpoint**: `/api/v1/payments/initiate`
- **Auth**: Required (`CITIZEN`)
- **Headers**: `Authorization: Bearer {{CITIZEN_TOKEN}}`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "serviceRequestId": "{{REQUEST_ID}}"
  }
  ```
- **Expected Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payment initiated successfully",
    "data": {
      "paymentId": "pay-9988-2026",
      "bkashURL": "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/bKash/create?paymentID=BK12345678"
    }
  }
  ```

---

### 4.17 Executive Reports & Analytics

#### 1. Overview Dashboard
- **Method**: `GET`
- **Endpoint**: `/api/v1/reports/overview?from=2026-01-01&to=2026-12-31`
- **Auth**: Required (`ADMIN`, `SUPER_ADMIN`)
- **Headers**: `Authorization: Bearer {{ADMIN_TOKEN}}`
- **Expected Status**: `200 OK`
- **Response Payload**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Overview report retrieved successfully",
    "data": {
      "overview": {
        "totalRequests": 120,
        "submitted": 10,
        "underReview": 5,
        "approved": 15,
        "assigned": 20,
        "inProgress": 30,
        "resolutionSubmitted": 10,
        "resolved": 25,
        "closed": 5,
        "slaBreachedCount": 4,
        "totalPaidServices": 40,
        "successfulPayments": 38,
        "totalRevenue": 57000.00
      }
    }
  }
  ```

---

## 5. RBAC Security Negative Tests

Verify RBAC protection by performing the following unauthorized calls and asserting error codes:

| Test Case | Method | Endpoint | User Role | Expected Code | Expected Error Message |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Citizen attempts to create Admin | `POST` | `/api/v1/admin/admins` | `CITIZEN` | `403` | `Forbidden: You do not have permission to perform this action` |
| Staff attempts to manage Municipality | `POST` | `/api/v1/municipalities` | `STAFF` | `403` | `Forbidden` |
| Citizen attempts to assign technician | `POST` | `/api/v1/service-requests/:id/assign` | `CITIZEN` | `403` | `Forbidden` |
| Technician verifies own resolution | `POST` | `/api/v1/service-requests/:id/verify` | `STAFF` (Self) | `403` | `Technicians are strictly forbidden from verifying their own work resolution` |
| Unauthenticated request | `GET` | `/api/v1/reports/overview` | None | `401` | `You are not authorized!` |

---

## 6. Validation & Error Handling Tests

Test system resilience against invalid inputs:

| Negative Input Test | Payload / Condition | Expected Status | Expected Response Pattern |
| :--- | :--- | :--- | :--- |
| **Invalid Email Format** | `"email": "not-an-email"` | `400 Bad Request` | Zod Validation Error listing `email` property |
| **Weak Password** | `"password": "123"` | `400 Bad Request` | Password complexity requirements failure |
| **Duplicate Category Code** | Code matching existing category in same department | `409 Conflict` | `Category code already exists in this department` |
| **Paid Service without Base Fee** | `"isPaid": true` without `baseFee` | `400 Bad Request` | `Base fee is required for paid services` |
| **Invalid Date Range** | `from=2026-12-31&to=2026-01-01` | `400 Bad Request` | `Start date (from) cannot be after end date (to)` |

---

## 7. File Upload Testing Instructions

To test endpoints accepting file uploads in Postman (`/api/v1/service-requests`, `/api/v1/user/profile-image`, `/service-requests/:id/updates`, `/service-requests/:id/resolution`):

1. Set HTTP Method to `POST` or `PATCH`.
2. Select **Body** tab → Select **form-data**.
3. For file attachments:
   - Key: `files` (Set type dropdown from `Text` to `File`).
   - Value: Select 1 to 5 image/pdf files.
4. For endpoints with metadata (e.g. Service Request creation):
   - Key: `data` (Type: `Text`).
   - Value: Paste JSON string representation of payload.

---

## 8. Pagination, Filtering & Search Examples

All paginated GET APIs support standard query parameters:

```http
GET /api/v1/service-requests?page=1&limit=10&status=IN_PROGRESS&priority=HIGH&searchTerm=Garbage
```

### Supported Query Parameters:
- `page`: Page number (default: `1`).
- `limit`: Records per page (default: `10`).
- `searchTerm`: Text search matching title/description/name/code.
- `sortBy`: Field name to sort by (e.g. `createdAt`).
- `sortOrder`: `asc` or `desc` (default: `desc`).
- `from` & `to`: ISO Date strings (`YYYY-MM-DD`).
