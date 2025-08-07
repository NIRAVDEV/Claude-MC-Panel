-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'WELCOME_BONUS';
ALTER TYPE "TransactionType" ADD VALUE 'COMPLETED';
ALTER TYPE "TransactionType" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'COMPLETED';
