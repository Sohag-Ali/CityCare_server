-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'STATUS_CHANGE', 'ASSIGN', 'REASSIGN', 'APPROVE', 'REJECT', 'VERIFY', 'ESCALATE', 'PAYMENT_INITIATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PASSWORD_RESET', 'STAFF_ACTIVATED', 'STAFF_DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('USER', 'STAFF', 'CATEGORY', 'MUNICIPAL_SERVICE', 'SERVICE_REQUEST', 'ASSIGNMENT', 'RESOLUTION', 'PAYMENT', 'SLA');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'STAFF', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('OFFICER', 'TECHNICIAN', 'MANAGER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'VERIFICATION', 'RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED', 'DUPLICATE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ServicePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'ACCEPTED', 'RELEASED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('COMPLAINT', 'BEFORE', 'PROGRESS', 'AFTER', 'RESOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVED', 'REWORK_REQUIRED');

-- CreateEnum
CREATE TYPE "SlaEventType" AS ENUM ('WARNING', 'BREACH', 'ESCALATION');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'REQUEST_STATUS_CHANGED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_ASSIGNED', 'REQUEST_ACCEPTED', 'REQUEST_STARTED', 'RESOLUTION_SUBMITTED', 'RESOLUTION_REWORK_REQUIRED', 'REQUEST_RESOLVED', 'REQUEST_CLOSED', 'SLA_WARNING', 'SLA_BREACH', 'PAYMENT_INITIATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntity" NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizens" (
    "id" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "gender" "Gender",
    "age" INTEGER,
    "region" TEXT,
    "permanentAddress" TEXT,
    "profileImage" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'SLA_BREACH',
    "level" INTEGER NOT NULL DEFAULT 1,
    "escalatedToDepartmentId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PaymentState" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'BKASH',
    "merchantInvoiceNumber" TEXT NOT NULL,
    "bkashPaymentId" TEXT,
    "bkashTransactionId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "PaymentState" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolutions" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolution_verifications" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "comments" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolution_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipal_services" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "baseFee" DECIMAL(12,2),
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipal_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ServicePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(12,2),
    "currency" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "responseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "responseStartedAt" TIMESTAMP(3),
    "responseCompletedAt" TIMESTAMP(3),
    "resolutionStartedAt" TIMESTAMP(3),
    "resolutionCompletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_locations" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "evidenceType" "EvidenceType" DEFAULT 'OTHER',
    "technicianUpdateId" TEXT,
    "resolutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_histories" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_counters" (
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_request_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "sla_events" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "type" "SlaEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "priority" "ServicePriority" NOT NULL,
    "responseTimeMinutes" INTEGER NOT NULL,
    "resolutionTimeMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "staffType" "StaffType" NOT NULL,
    "designation" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_updates" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "progressPercentage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIAL',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "wardNumber" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assignment_serviceRequestId" ON "assignments"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_assignment_technicianId" ON "assignments"("technicianId");

-- CreateIndex
CREATE INDEX "idx_assignment_assignedById" ON "assignments"("assignedById");

-- CreateIndex
CREATE INDEX "idx_assignment_status" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "idx_assignment_createdAt" ON "assignments"("createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_actorId" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_entityType" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "idx_audit_entityId" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "idx_audit_createdAt" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_entity_composite" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_category_departmentId" ON "categories"("departmentId");

-- CreateIndex
CREATE INDEX "idx_category_isActive" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "idx_category_isDeleted" ON "categories"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "categories_departmentId_code_key" ON "categories"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "citizens_userId_key" ON "citizens"("userId");

-- CreateIndex
CREATE INDEX "idx_citizen_isDeleted" ON "citizens"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_department_municipalityId" ON "departments"("municipalityId");

-- CreateIndex
CREATE INDEX "idx_department_isActive" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "idx_department_isDeleted" ON "departments"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "departments_municipalityId_code_key" ON "departments"("municipalityId", "code");

-- CreateIndex
CREATE INDEX "idx_escalation_serviceRequestId" ON "escalations"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_escalation_status" ON "escalations"("status");

-- CreateIndex
CREATE INDEX "idx_escalation_createdAt" ON "escalations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_code_key" ON "municipalities"("code");

-- CreateIndex
CREATE INDEX "idx_municipality_code" ON "municipalities"("code");

-- CreateIndex
CREATE INDEX "idx_municipality_isActive" ON "municipalities"("isActive");

-- CreateIndex
CREATE INDEX "idx_municipality_isDeleted" ON "municipalities"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_notification_userId" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "idx_notification_user_isRead" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "idx_notification_createdAt" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_entity" ON "notifications"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchantInvoiceNumber_key" ON "payments"("merchantInvoiceNumber");

-- CreateIndex
CREATE INDEX "idx_payment_serviceRequestId" ON "payments"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_payment_citizenId" ON "payments"("citizenId");

-- CreateIndex
CREATE INDEX "idx_payment_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payment_bkashPaymentId" ON "payments"("bkashPaymentId");

-- CreateIndex
CREATE INDEX "idx_payment_bkashTransactionId" ON "payments"("bkashTransactionId");

-- CreateIndex
CREATE INDEX "idx_payment_event_paymentId" ON "payment_events"("paymentId");

-- CreateIndex
CREATE INDEX "idx_resolution_serviceRequestId" ON "resolutions"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_resolution_submittedById" ON "resolutions"("submittedById");

-- CreateIndex
CREATE INDEX "idx_verification_serviceRequestId" ON "resolution_verifications"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_verification_resolutionId" ON "resolution_verifications"("resolutionId");

-- CreateIndex
CREATE INDEX "idx_verification_verifiedById" ON "resolution_verifications"("verifiedById");

-- CreateIndex
CREATE INDEX "idx_service_categoryId" ON "municipal_services"("categoryId");

-- CreateIndex
CREATE INDEX "idx_service_isActive" ON "municipal_services"("isActive");

-- CreateIndex
CREATE INDEX "idx_service_isPaid" ON "municipal_services"("isPaid");

-- CreateIndex
CREATE INDEX "idx_service_isDeleted" ON "municipal_services"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_services_categoryId_code_key" ON "municipal_services"("categoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_trackingNumber_key" ON "service_requests"("trackingNumber");

-- CreateIndex
CREATE INDEX "idx_request_citizenId" ON "service_requests"("citizenId");

-- CreateIndex
CREATE INDEX "idx_request_serviceId" ON "service_requests"("serviceId");

-- CreateIndex
CREATE INDEX "idx_request_status" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "idx_request_paymentStatus" ON "service_requests"("paymentStatus");

-- CreateIndex
CREATE INDEX "idx_request_isDeleted" ON "service_requests"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_request_createdAt" ON "service_requests"("createdAt");

-- CreateIndex
CREATE INDEX "idx_request_responseDueAt" ON "service_requests"("responseDueAt");

-- CreateIndex
CREATE INDEX "idx_request_resolutionDueAt" ON "service_requests"("resolutionDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "request_locations_requestId_key" ON "request_locations"("requestId");

-- CreateIndex
CREATE INDEX "idx_location_wardId" ON "request_locations"("wardId");

-- CreateIndex
CREATE INDEX "idx_attachment_requestId" ON "request_attachments"("requestId");

-- CreateIndex
CREATE INDEX "idx_attachment_uploadedById" ON "request_attachments"("uploadedById");

-- CreateIndex
CREATE INDEX "idx_attachment_technicianUpdateId" ON "request_attachments"("technicianUpdateId");

-- CreateIndex
CREATE INDEX "idx_attachment_resolutionId" ON "request_attachments"("resolutionId");

-- CreateIndex
CREATE INDEX "idx_history_requestId" ON "request_status_histories"("requestId");

-- CreateIndex
CREATE INDEX "idx_history_changedById" ON "request_status_histories"("changedById");

-- CreateIndex
CREATE INDEX "idx_history_createdAt" ON "request_status_histories"("createdAt");

-- CreateIndex
CREATE INDEX "idx_slaevent_serviceRequestId" ON "sla_events"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_slaevent_type" ON "sla_events"("type");

-- CreateIndex
CREATE INDEX "idx_slaevent_occurredAt" ON "sla_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policies_priority_key" ON "sla_policies"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employeeId_key" ON "staff_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "idx_staff_userId" ON "staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "idx_staff_employeeId" ON "staff_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "idx_staff_departmentId" ON "staff_profiles"("departmentId");

-- CreateIndex
CREATE INDEX "idx_staff_staffType" ON "staff_profiles"("staffType");

-- CreateIndex
CREATE INDEX "idx_staff_isActive" ON "staff_profiles"("isActive");

-- CreateIndex
CREATE INDEX "idx_staff_isDeleted" ON "staff_profiles"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_techupdate_serviceRequestId" ON "technician_updates"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_techupdate_technicianId" ON "technician_updates"("technicianId");

-- CreateIndex
CREATE INDEX "idx_techupdate_createdAt" ON "technician_updates"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_ward_municipalityId" ON "wards"("municipalityId");

-- CreateIndex
CREATE INDEX "idx_ward_zoneId" ON "wards"("zoneId");

-- CreateIndex
CREATE INDEX "idx_ward_isActive" ON "wards"("isActive");

-- CreateIndex
CREATE INDEX "idx_ward_isDeleted" ON "wards"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "wards_municipalityId_code_key" ON "wards"("municipalityId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "wards_municipalityId_wardNumber_key" ON "wards"("municipalityId", "wardNumber");

-- CreateIndex
CREATE INDEX "idx_zone_municipalityId" ON "zones"("municipalityId");

-- CreateIndex
CREATE INDEX "idx_zone_isActive" ON "zones"("isActive");

-- CreateIndex
CREATE INDEX "idx_zone_isDeleted" ON "zones"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "zones_municipalityId_code_key" ON "zones"("municipalityId", "code");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedToDepartmentId_fkey" FOREIGN KEY ("escalatedToDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipal_services" ADD CONSTRAINT "municipal_services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "municipal_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_locations" ADD CONSTRAINT "request_locations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_locations" ADD CONSTRAINT "request_locations_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_technicianUpdateId_fkey" FOREIGN KEY ("technicianUpdateId") REFERENCES "technician_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_histories" ADD CONSTRAINT "request_status_histories_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_histories" ADD CONSTRAINT "request_status_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_events" ADD CONSTRAINT "sla_events_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_updates" ADD CONSTRAINT "technician_updates_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_updates" ADD CONSTRAINT "technician_updates_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
