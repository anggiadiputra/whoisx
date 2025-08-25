# Domain Management Web App PRD (v2)

## 1. Overview
A full-stack web application for managing domain records using Next.js as both frontend and backend.  
The application fetches WHOIS/RDAP data from multiple providers, stores results in PostgreSQL, and provides a dashboard for domain management.  
The app will be deployed on Vercel.

---

## 2. Objectives
- Centralize domain tracking and management.
- Automate WHOIS lookups from multiple RDAP endpoints.
- Provide batch processing to handle multiple domains efficiently.
- Cache WHOIS data to reduce API load and latency.
- Allow price tracking for domain renewals.

---

## 3. Features

### 3.1 Domain Management
- Add domain with renewal price and notes.
- Update or delete domain entries.
- View domain details with latest WHOIS info.

### 3.2 WHOIS Lookup
- Integrate with multiple RDAP APIs:
  - https://rdap.verisign.com/com/v1/domain/${domain}
  - https://rdap.verisign.com/cc/v1/domain/${domain}
  - https://rdap.idnic.id/rdap/domain/${domain}
  - https://rdap.neustar.biz/rdap/domain/${domain}
  - https://rdap.afilias.net/rdap/domain/${domain}
  - https://rdap.pir.org/rdap/domain/${domain}
- Use batch API to process up to N domains per request.
- Implement retry logic for failed lookups.
- Store results in cache and database.

### 3.3 Dashboard
- List all domains with expiry countdown.
- Filters:
  - Expiring in 30 days
  - Expiring in 7 days
  - Expiring in 1 day
- Sort by expiry date, registrar, renewal price.

### 3.4 User Roles
- **Admin**: Full access (manage users, manage domains).
- **Staff**: Manage domains only.
- **Finance**: Read-only + view renewal prices.

### 3.5 Caching
- Use in-memory cache (e.g., Redis or in-app LRU) for WHOIS results.
- Cache duration: configurable (e.g., 24h).
- Cache invalidation on manual refresh.

### 3.6 Error Handling
- Log API failures with timestamp & endpoint.
- Gracefully handle:
  - Network timeouts
  - Invalid domain formats
  - Unsupported TLDs
- Display fallback message if no data available.

---

## 4. Functional Requirements
1. Users can add domains with renewal price and notes.
2. The system checks WHOIS data when a domain is added or manually refreshed.
3. Batch WHOIS processing supported.
4. Cache results to minimize API calls.
5. Display WHOIS info and renewal countdown in dashboard.
6. Role-based access control.
7. Handle and log errors without breaking UI.

---

## 5. Non-Functional Requirements
- **Performance**: WHOIS lookups for up to 100 domains within 10s (with caching).
- **Scalability**: Should scale horizontally on Vercel.
- **Security**: Protect API routes with authentication.
- **Availability**: 99% uptime target.

---

## 6. Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase or Vercel PostgreSQL)
- **Cache**: Redis (Upstash) or in-app memory cache
- **Auth**: NextAuth.js (JWT-based)
- **Deployment**: Vercel

---

## 7. API Endpoints

### 7.1 Domain Management
- `POST /api/domains` — Add new domain.
- `GET /api/domains` — List all domains.
- `GET /api/domains/:id` — Get domain details.
- `PUT /api/domains/:id` — Update domain.
- `DELETE /api/domains/:id` — Delete domain.

### 7.2 WHOIS Lookup
- `POST /api/whois` — Single domain lookup.
- `POST /api/whois/batch` — Batch lookup for multiple domains.
- `GET /api/whois/cache/:domain` — Get cached WHOIS data.

---

## 8. Database Design

### 8.1 Tables

#### users
| Field         | Type      | Notes             |
|---------------|-----------|-------------------|
| id            | UUID PK   |                   |
| name          | String    |                   |
| email         | String    | Unique            |
| role          | Enum      | admin/staff/finance|
| password_hash | String    |                   |
| created_at    | Timestamp |                   |

#### domains
| Field            | Type      | Notes              |
|------------------|-----------|--------------------|
| id               | UUID PK   |                    |
| domain           | String    | Unique             |
| renewal_price    | Decimal   |                    |
| notes            | Text      |                    |
| registrar        | String    | From WHOIS         |
| created_date     | Date      | From WHOIS         |
| expiry_date      | Date      | From WHOIS         |
| status           | String    | From WHOIS         |
| days_to_expiry   | Integer   | Calculated field   |
| last_checked     | Timestamp |                    |
| created_at       | Timestamp |                    |

#### whois_cache
| Field        | Type      | Notes                   |
|--------------|-----------|-------------------------|
| id           | UUID PK   |                         |
| domain       | String    |                         |
| whois_data   | JSONB     | Raw RDAP JSON response  |
| cached_at    | Timestamp |                         |

---

## 9. Error Handling Flow
1. Validate domain format before API call.
2. Try primary RDAP endpoint based on TLD.
3. If fail → retry up to 3 times with delay.
4. If still fail → try alternative endpoints.
5. If all fail → log error, return fallback message.

---

## 10. Future Features
- Domain expiry reminder emails.
- Integration with registrar APIs for auto-renew.
- Export to CSV/Excel.
- Multi-language support.

