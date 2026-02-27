# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SaldoBirras Pro is a professional balance management system for a sports bar (BirraSport). Customers load money/beer credits onto their accounts, identified by QR codes, and staff processes recharges and consumption. Includes a customer-facing order portal, email notifications, PDF card generation, and analytics.

**Language:** Spanish (all UI text, variable names in English, comments mixed)

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

No test framework is configured.

## Tech Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Supabase** (PostgreSQL with RLS, Auth, Realtime, Storage)
- **Tailwind CSS** with custom dark theme (amber primary, navy/dark backgrounds)
- **Zustand** for client-side state management
- **Resend** for transactional emails
- **Vercel** for hosting

## Architecture

### Two Supabase Clients

- `src/lib/supabase-browser.ts` — Browser client using `@supabase/ssr`, session-scoped, used in components
- `src/lib/supabase-admin.ts` — Server-side admin client using service role key, used exclusively in API routes. Never import this in client code.

### API Routes (`src/app/api/`)

All API routes use the admin Supabase client. Authentication is handled by `getAuthUser()` from `src/lib/api-auth.ts`, which extracts JWT from the `Authorization: Bearer` header. Key utilities in `api-auth.ts`:
- `getAuthUser(req)` — validates JWT, returns user + business
- `unauthorized()`, `badRequest()`, `ok()` — standard response helpers
- Built-in rate limiting (30 req/60s per IP) and input sanitization

Two routes are public (no auth): `POST /api/orders` (customer order creation) and `GET /api/portal` (customer lookup by PIN/QR).

### Transactions Are Atomic

Recharges and consumption use Supabase RPC functions (`process_recharge`, `process_consume`, `hold_balance`, `release_hold`) defined in SQL migrations. These are PostgreSQL functions that update balance and create transaction records atomically. Never update balances with separate queries.

### State Management (`src/lib/store.ts`)

Single Zustand store holds auth state, customer list, and UI state (current view, selected customer, search, loading). Views are swapped via `store.view` — there's no client-side routing between dashboard sections.

### Multi-Tenancy

All data is scoped by `business_id`. Supabase RLS policies enforce tenant isolation at the database level.

### Subdomain Routing (`src/middleware.ts`)

`portal.*` subdomains are rewritten to `/portal` routes. The main app serves on the root domain.

### Permission Model

Three roles: `owner`, `cashier`, `auditor`. Each user has a `permissions` JSON object with granular flags (`dashboard`, `register`, `recharge`, `consume`, `transactions`, `stats`, `export`, `edit_customer`, `send_email`, `manage_users`). Owner bypasses restrictions; other roles are checked per-action in API routes.

## Database Migrations

Sequential SQL files in `supabase/` (001 through 008). Run manually in Supabase SQL Editor. Includes schema, RLS policies, triggers, and stored procedures.

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- API responses always return `{ success: boolean, data?, error? }` matching `ApiResponse<T>` type
- All types are in `src/lib/types.ts`
- Utility functions (formatting, avatar colors, balance checks) in `src/lib/utils.ts`
- Email templates and sending logic in `src/lib/email.ts`
- Custom Tailwind colors: primary (amber `#F5A623`), dark backgrounds (`#080D19`, `#0C1324`, `#111A30`), success green (`#00D68F`), error red (`#FF4757`)
- Components follow a `*View.tsx` pattern for main dashboard sections (e.g., `DashboardView.tsx`, `CustomerView.tsx`, `OrdersView.tsx`)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role (server-only, never expose)
RESEND_API_KEY                 # Resend email service (server-only)
```
