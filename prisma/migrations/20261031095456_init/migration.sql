-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'STAFF', 'FINANCE');

-- CreateEnum
CREATE TYPE "public"."DomainStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'SUSPENDED', 'PENDING_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."ServerType" AS ENUM ('HOSTING', 'VPS');

-- CreateEnum
CREATE TYPE "public"."ServerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'MAINTENANCE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WebsiteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DEVELOPMENT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'DOMAIN_ADDED', 'DOMAIN_UPDATED', 'DOMAIN_DELETED', 'SERVER_ADDED', 'SERVER_UPDATED', 'SERVER_DELETED', 'WEBSITE_ADDED', 'WEBSITE_UPDATED', 'WEBSITE_DELETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STAFF',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "renewal_price" DECIMAL(65,30),
    "notes" TEXT,
    "registrar" TEXT,
    "created_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "updated_date" TIMESTAMP(3),
    "status" "public"."DomainStatus" NOT NULL DEFAULT 'ACTIVE',
    "days_to_expiry" INTEGER,
    "last_checked" TIMESTAMP(3),
    "name_servers" TEXT,
    "domain_status" TEXT,
    "dnssec_status" TEXT,
    "registrar_whois_server" TEXT,
    "server_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whois_cache" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "whois_data" JSONB NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whois_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."servers" (
    "id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "server_type" "public"."ServerType" NOT NULL,
    "status" "public"."ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "ip_address" TEXT,
    "created_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "last_checked" TIMESTAMP(3),
    "days_to_expiry" INTEGER,
    "username" TEXT,
    "password" TEXT,
    "notes" TEXT,
    "is_monitored" BOOLEAN NOT NULL DEFAULT false,
    "uptime_percent" DECIMAL(65,30),
    "last_downtime" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."websites" (
    "id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "cms" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "status" "public"."WebsiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_live" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activities" (
    "id" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "public"."verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "public"."verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_key" ON "public"."domains"("domain");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."domains" ADD CONSTRAINT "domains_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whois_cache" ADD CONSTRAINT "whois_cache_domain_fkey" FOREIGN KEY ("domain") REFERENCES "public"."domains"("domain") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."websites" ADD CONSTRAINT "websites_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
