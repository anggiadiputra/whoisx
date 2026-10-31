# Domain Management Web App

A comprehensive domain management web application built with Next.js that centralizes WHOIS tracking, automates renewal monitoring, and provides role-based access for managing domain portfolios.

## Features

- **Domain Management**: Add, update, and delete domain records with renewal prices and notes
- **WHOIS Integration**: Automatic WHOIS lookups using multiple RDAP providers with retry logic
- **Expiry Tracking**: Real-time monitoring of domain expiry dates with visual alerts
- **Batch Processing**: Handle multiple domains efficiently with bulk operations
- **Dashboard**: Comprehensive overview with filtering and search capabilities
- **Caching**: Smart caching system to reduce API calls and improve performance

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL
- **RDAP Providers**: Verisign, IDNIC, Neustar, Afilias, PIR
- **Deployment**: Cloudflare Workers (OpenNext + Hyperdrive) or any Node.js host

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd domain-manager
   npm install
   ```

2. **Environment Configuration**:
   Put `DATABASE_URL` in `.env` (the Prisma CLI does not read `.env.local`):
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/domain_manager"
   ```
   and the auth settings in `.env.local`:
   ```bash
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Database Setup** (`npm install` already runs `prisma generate`):
   ```bash
   npm run db:migrate
   npm run db:seed      # optional sample users
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Open Application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Domain Management
- `GET /api/domains` - List domains with filtering
- `POST /api/domains` - Add new domain with WHOIS lookup
- `GET /api/domains/[id]` - Get domain details
- `PUT /api/domains/[id]` - Update domain
- `DELETE /api/domains/[id]` - Delete domain

### WHOIS Operations
- `POST /api/whois` - Single domain WHOIS lookup
- `POST /api/whois/batch` - Batch domain processing

## Database Schema

### Domains Table
- `id` - Unique identifier
- `domain` - Domain name (unique)
- `renewal_price` - Annual renewal cost
- `notes` - Optional notes
- `registrar` - From WHOIS data
- `created_date` - From WHOIS data
- `expiry_date` - From WHOIS data
- `status` - Domain status
- `days_to_expiry` - Calculated field
- `last_checked` - Last WHOIS check

### WHOIS Cache Table
- `id` - Unique identifier
- `domain` - Domain name
- `whois_data` - Raw RDAP JSON response
- `cached_at` - Cache timestamp

## RDAP Providers

The application uses multiple RDAP providers for comprehensive domain coverage:

- **Verisign**: .com, .cc domains
- **IDNIC**: .id domains
- **Neustar**: .biz domains
- **Afilias**: .info, .org domains
- **PIR**: .org domains
- **Fallback providers**: Generic RDAP endpoints

## Features Roadmap

- [ ] User authentication and role-based access
- [ ] Email notifications for expiring domains
- [ ] Registrar API integration for auto-renewal
- [ ] CSV/Excel export functionality
- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] Webhook integrations

## Development

### Project Structure
```
src/
├── app/
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Dashboard page
├── components/
│   └── ui/             # UI components
├── lib/
│   ├── prisma.ts       # Database client
│   ├── rdap.ts         # WHOIS service
│   └── utils.ts        # Utilities
└── prisma/
    └── schema.prisma   # Database schema
```

### Key Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npx prisma studio    # Open database browser
npx prisma migrate   # Run database migrations
```

## Production Deployment

### Cloudflare Workers

The app runs on Workers through [OpenNext](https://opennext.js.org/cloudflare). PostgreSQL is reached through
[Hyperdrive](https://developers.cloudflare.com/hyperdrive/), and `src/lib/prisma.ts` creates a Prisma client per
request because Workers cannot share database connections between requests.

1. Apply migrations to the production database (from your machine or CI):
   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```
2. Create a Hyperdrive config and copy its id into `wrangler.jsonc` (`hyperdrive[0].id`):
   ```bash
   npx wrangler hyperdrive create whoisx-db --connection-string="postgresql://user:password@host:5432/db"
   ```
3. Set `NEXTAUTH_URL` in `wrangler.jsonc` (`vars`) to the Worker URL or your custom domain, then add the secret:
   ```bash
   npx wrangler secret put NEXTAUTH_SECRET
   ```
4. Build and deploy:
   ```bash
   npm run deploy
   ```

To try the Worker locally, copy `.dev.vars.example` to `.dev.vars` and run `npm run preview` (http://localhost:8787).
It connects to the `localConnectionString` in `wrangler.jsonc`, which can be overridden with
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.

Password hashing (login, password changes) uses more CPU than the Workers Free plan allows per request, so plan on
Workers Paid.

### Other Node.js hosts

`npm run build && npm start` with these environment variables:
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="production-secret"
NEXTAUTH_URL="https://yourdomain.com"
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issues page.