-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."NodeStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."ServerStatus" AS ENUM ('CREATING', 'CREATED', 'RUNNING', 'STOPPED', 'STARTING', 'STOPPING', 'RESTARTING', 'ERROR', 'INSTALLING', 'REMOVING', 'REMOVED');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('CREDIT_PURCHASE', 'SERVER_COST', 'ADMIN_CREDITS', 'WELCOME_BONUS', 'AD_REWARD', 'TASK_REWARD', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "credits" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 25575,
    "maxServers" INTEGER NOT NULL DEFAULT 10,
    "maxRAM" INTEGER NOT NULL DEFAULT 32768,
    "maxStorage" INTEGER NOT NULL DEFAULT 500000,
    "location" TEXT,
    "status" "public"."NodeStatus" NOT NULL DEFAULT 'OFFLINE',
    "description" TEXT,
    "scheme" TEXT NOT NULL DEFAULT 'https',
    "behindProxy" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "publicNode" BOOLEAN NOT NULL DEFAULT true,
    "totalMemory" INTEGER NOT NULL DEFAULT 5120,
    "memoryOverallocation" INTEGER NOT NULL DEFAULT 0,
    "totalDiskSpace" INTEGER NOT NULL DEFAULT 102400,
    "diskOverallocation" INTEGER NOT NULL DEFAULT 0,
    "daemonPort" INTEGER NOT NULL DEFAULT 8080,
    "daemonSftpPort" INTEGER NOT NULL DEFAULT 2022,
    "verificationToken" TEXT NOT NULL,
    "usedRAM" INTEGER NOT NULL DEFAULT 0,
    "usedStorage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPing" TIMESTAMP(3),

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "software" TEXT NOT NULL DEFAULT 'VANILLA',
    "version" TEXT NOT NULL DEFAULT 'latest',
    "ram" INTEGER NOT NULL DEFAULT 1024,
    "storage" INTEGER NOT NULL DEFAULT 5120,
    "port" INTEGER,
    "status" "public"."ServerStatus" NOT NULL DEFAULT 'STOPPED',
    "nodeId" TEXT NOT NULL,
    "containerId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastStart" TIMESTAMP(3),

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."server_logs" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."server_backups" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."websocket_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "serverId" TEXT,
    "nodeId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websocket_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."credit_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ad_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxPerUser" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_name_key" ON "public"."nodes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_verificationToken_key" ON "public"."nodes"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "servers_containerId_key" ON "public"."servers"("containerId");

-- CreateIndex
CREATE UNIQUE INDEX "servers_name_userId_key" ON "public"."servers"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servers" ADD CONSTRAINT "servers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_logs" ADD CONSTRAINT "server_logs_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_backups" ADD CONSTRAINT "server_backups_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
