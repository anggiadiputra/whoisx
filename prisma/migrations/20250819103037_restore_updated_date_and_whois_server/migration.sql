-- AlterTable
ALTER TABLE "domains" ADD COLUMN "registrar_whois_server" TEXT;
ALTER TABLE "domains" ADD COLUMN "updated_date" DATETIME;
