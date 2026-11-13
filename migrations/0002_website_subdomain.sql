-- Websites can live on a subdomain of a tracked domain (e.g. blog.example.com).
-- "" means the domain itself; existing rows become root sites.
ALTER TABLE "websites" ADD COLUMN "subdomain" TEXT NOT NULL DEFAULT '';

-- One website per address: a domain can hold several sites, each on a different subdomain.
CREATE UNIQUE INDEX "websites_domain_id_subdomain_key" ON "websites"("domain_id", "subdomain");
