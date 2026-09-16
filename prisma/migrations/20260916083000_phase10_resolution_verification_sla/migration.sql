-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVED', 'REWORK_REQUIRED');

-- CreateEnum
CREATE TYPE "SlaEventType" AS ENUM ('WARNING', 'BREACH', 'ESCALATION');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "resolutionCompletedAt" TIMESTAMP(3),
ADD COLUMN     "resolutionDueAt" TIMESTAMP(3),
ADD COLUMN     "resolutionStartedAt" TIMESTAMP(3),
ADD COLUMN     "responseCompletedAt" TIMESTAMP(3),
ADD COLUMN     "responseDueAt" TIMESTAMP(3),
ADD COLUMN     "responseStartedAt" TIMESTAMP(3);

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

-- CreateIndex
CREATE INDEX "idx_verification_serviceRequestId" ON "resolution_verifications"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_verification_resolutionId" ON "resolution_verifications"("resolutionId");

-- CreateIndex
CREATE INDEX "idx_verification_verifiedById" ON "resolution_verifications"("verifiedById");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policies_priority_key" ON "sla_policies"("priority");

-- CreateIndex
CREATE INDEX "idx_slaevent_serviceRequestId" ON "sla_events"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_slaevent_type" ON "sla_events"("type");

-- CreateIndex
CREATE INDEX "idx_slaevent_occurredAt" ON "sla_events"("occurredAt");

-- CreateIndex
CREATE INDEX "idx_escalation_serviceRequestId" ON "escalations"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_escalation_status" ON "escalations"("status");

-- CreateIndex
CREATE INDEX "idx_escalation_createdAt" ON "escalations"("createdAt");

-- CreateIndex
CREATE INDEX "idx_request_responseDueAt" ON "service_requests"("responseDueAt");

-- CreateIndex
CREATE INDEX "idx_request_resolutionDueAt" ON "service_requests"("resolutionDueAt");

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_verifications" ADD CONSTRAINT "resolution_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_events" ADD CONSTRAINT "sla_events_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedToDepartmentId_fkey" FOREIGN KEY ("escalatedToDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
