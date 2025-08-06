-- CreateEnum
CREATE TYPE "ServerManagement" AS ENUM ('CREATING', 'CREATED', 'REMOVING', 'REMOVED');

-- AlterTable
ALTER TABLE "servers" ADD COLUMN     "servermanagement" "ServerManagement"[];
