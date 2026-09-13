-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'INACTIVE';

-- AlterTable
ALTER TABLE "citizens" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "region" TEXT;
