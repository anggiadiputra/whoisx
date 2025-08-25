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
- **Deployment**: Vercel-ready

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
   Create `.env.local` file:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/domain_manager"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Database Setup**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
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

### Vercel Deployment
1. Connect repository to Vercel
2. Configure environment variables
3. Setup PostgreSQL database (Supabase/Railway/Neon)
4. Deploy

### Environment Variables for Production
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