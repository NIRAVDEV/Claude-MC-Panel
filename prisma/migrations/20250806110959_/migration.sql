/*
  Warnings:

  - You are about to drop the column `host` on the `nodes` table. All the data in the column will be lost.
  - Added the required column `ip` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `credits` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nodes" DROP COLUMN "host",
ADD COLUMN     "ip" TEXT NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "credits" INTEGER NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ON GOING';
