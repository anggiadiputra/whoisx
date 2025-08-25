-- AlterTable
ALTER TABLE "domains" ADD COLUMN "dnssec_status" TEXT;
ALTER TABLE "domains" ADD COLUMN "domain_status" TEXT;
ALTER TABLE "domains" ADD COLUMN "name_servers" TEXT;
ALTER TABLE "domains" ADD COLUMN "registrar_abuse_email" TEXT;
ALTER TABLE "domains" ADD COLUMN "registrar_abuse_phone" TEXT;
ALTER TABLE "domains" ADD COLUMN "registrar_url" TEXT;
ALTER TABLE "domains" ADD COLUMN "registrar_whois_server" TEXT;
ALTER TABLE "domains" ADD COLUMN "updated_date" DATETIME;
