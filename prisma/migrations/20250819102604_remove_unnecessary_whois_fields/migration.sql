/*
  Warnings:

  - You are about to drop the column `registrar_abuse_email` on the `domains` table. All the data in the column will be lost.
  - You are about to drop the column `registrar_abuse_phone` on the `domains` table. All the data in the column will be lost.
  - You are about to drop the column `registrar_url` on the `domains` table. All the data in the column will be lost.
  - You are about to drop the column `registrar_whois_server` on the `domains` table. All the data in the column will be lost.
  - You are about to drop the column `updated_date` on the `domains` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_domains" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "renewal_price" DECIMAL,
    "notes" TEXT,
    "registrar" TEXT,
    "created_date" DATETIME,
    "expiry_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "days_to_expiry" INTEGER,
    "last_checked" DATETIME,
    "name_servers" TEXT,
    "domain_status" TEXT,
    "dnssec_status" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_domains" ("created_at", "created_date", "days_to_expiry", "dnssec_status", "domain", "domain_status", "expiry_date", "id", "last_checked", "name_servers", "notes", "registrar", "renewal_price", "status", "updated_at") SELECT "created_at", "created_date", "days_to_expiry", "dnssec_status", "domain", "domain_status", "expiry_date", "id", "last_checked", "name_servers", "notes", "registrar", "renewal_price", "status", "updated_at" FROM "domains";
DROP TABLE "domains";
ALTER TABLE "new_domains" RENAME TO "domains";
CREATE UNIQUE INDEX "domains_domain_key" ON "domains"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
