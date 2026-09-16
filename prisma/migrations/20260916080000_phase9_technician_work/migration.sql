-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('BEFORE', 'PROGRESS', 'AFTER', 'OTHER');

-- AlterTable
ALTER TABLE "request_attachments" ADD COLUMN     "evidenceType" "EvidenceType" DEFAULT 'OTHER',
ADD COLUMN     "resolutionId" TEXT,
ADD COLUMN     "technicianUpdateId" TEXT,
ADD COLUMN     "uploadedById" TEXT;

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

-- CreateIndex
CREATE INDEX "idx_techupdate_serviceRequestId" ON "technician_updates"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_techupdate_technicianId" ON "technician_updates"("technicianId");

-- CreateIndex
CREATE INDEX "idx_techupdate_createdAt" ON "technician_updates"("createdAt");

-- CreateIndex
CREATE INDEX "idx_resolution_serviceRequestId" ON "resolutions"("serviceRequestId");

-- CreateIndex
CREATE INDEX "idx_resolution_submittedById" ON "resolutions"("submittedById");

-- CreateIndex
CREATE INDEX "idx_attachment_uploadedById" ON "request_attachments"("uploadedById");

-- CreateIndex
CREATE INDEX "idx_attachment_technicianUpdateId" ON "request_attachments"("technicianUpdateId");

-- CreateIndex
CREATE INDEX "idx_attachment_resolutionId" ON "request_attachments"("resolutionId");

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_technicianUpdateId_fkey" FOREIGN KEY ("technicianUpdateId") REFERENCES "technician_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_updates" ADD CONSTRAINT "technician_updates_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_updates" ADD CONSTRAINT "technician_updates_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
