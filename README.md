# MediGo - German UN 3373 Medical Courier Logistics Platform

MediGo is a security-hardened logistics and chain-of-custody platform engineered for Category B biological substance transport (UN 3373 ADR compliance) and protected health diagnostic data under European GDPR Article 9 regulations.

---

## Architecture & Technology Stack

- **Backend**: Express.js (Node.js runtime) with strict TypeScript, Helmet, cookie-based session management, and Zod input validation.
- **Frontend**: React 19 + Vite SPA, Tailwind CSS, Lucide icons, motion animations.
- **Persistence**: Supabase PostgreSQL with Row Level Security (RLS) policies and Prisma ORM client generator.
- **Authentication**: Zero-trust in-memory JWT access tokens (15-min lifespan) paired with HTTP-only, SameSite=Strict rotating refresh tokens (7-day lifespan) with automatic replay detection.
- **Offline Resilience**: Dedicated service worker and offline sync queue allowing couriers to scan barcodes, capture digital signatures, and record pre-trip checks without active network coverage.

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.x
- npm or bun

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure the mandatory variables:
```bash
cp .env.example .env
```

#### Required Variables:
| Variable | Description | Example / Safe Default |
| :--- | :--- | :--- |
| `JWT_SECRET` | Mandatory 32+ char secret for JWT HS256 tokens | `openssl rand -base64 48` |
| `APP_URL` | Canonical application origin for CSRF checks | `http://localhost:3000` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:3000,http://localhost:5173` |
| `NODE_ENV` | Runtime mode (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma migrations) | `postgresql://...` |
| `SUPABASE_URL` | Supabase project endpoint | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side elevated Supabase key | `eyJhb...` |

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Migrations
To initialize the database schema in Supabase Postgres:
1. Apply the migration scripts in `supabase-schema.sql` inside the Supabase SQL editor.
2. Run Prisma client generation:
   ```bash
   npx prisma generate
   ```

### 5. Running the Application
```bash
# Start development server (Express backend + Vite frontend)
npm run dev

# Run static TypeScript typecheck
npm run lint

# Run production build (compiles client bundle and server binary)
npm run build

# Start production server
npm start
```

### 6. Running Security & Regression Test Suites
MediGo includes an automated 107-test security verification suite covering authorization, IDOR, brute-force throttling, refresh token reuse, and CSRF protection:
```bash
npm test
```
