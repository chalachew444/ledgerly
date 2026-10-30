# Ledgerly

A personal and small-business finance tracker built with the Next.js App Router, TypeScript, Tailwind CSS, Recharts, Prisma, and PostgreSQL.

## Features

- Dashboard totals with weekly, monthly, and yearly summaries, recent activity, six-month income/expense comparison, and spending categories.
- Transaction creation, editing, deletion, search, and type/category/date-range filters.
- Multiple wallet accounts with account-scoped transactions, live converted balances, and cross-currency transfers.
- Client profiles and line-item invoices with payment states and browser print/PDF output.
- Automated monthly spend insights and week-over-week expense charts.
- Weekly and monthly recurring transaction settings on transaction entries.
- Monthly category budgets with remaining allowances, amber warnings at 80% usage, and red over-limit indicators.
- Task board with `TODO`, `IN_PROGRESS`, and `COMPLETED` states, descriptions, and due dates.
- Email/password authentication, a shared seeded demo account, and session-protected application routes and APIs.
- Filter-aware transaction CSV export and per-user ETB/USD/EUR display formatting.
- Persistent light/dark theme toggle and responsive desktop/mobile navigation.

## Requirements

- Node.js 20.9 or later.
- PostgreSQL 14 or later for persistent API storage.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL database.
3. Generate a unique `NEXTAUTH_SECRET` (for example with `openssl rand -base64 32`) and set it in `.env`.
4. Set `DEMO_PASSWORD` and `NEXT_PUBLIC_DEMO_PASSWORD` to the same demo-only password if you want to change the default.
5. Create the database tables, Prisma client, and demo workspace:

```bash
npx prisma migrate dev --name financial_ecosystem
npx prisma generate
npm run db:seed
```

6. Start the app using `npm run dev`, then open `http://localhost:3000`.

The demo login is `demo@ledgerly.com` with the password configured by `DEMO_PASSWORD` (default: `LedgerlyDemo!2026`). This is shared sample data, not a private account. Do not use the demo account for real financial information.

## API

- `GET /api/transactions?start=...&end=...&category=...&type=...`
- `POST`, `PUT`, and `DELETE /api/transactions`
- `GET`, `POST /api/accounts` and `POST /api/accounts/transfers`
- `GET`, `POST`, and `PUT /api/invoices`
- `GET /api/insights?currency=ETB|USD|EUR`
- `GET /api/exchange-rates`
- `GET /api/analytics?range=week|month|year`
- `GET`, `POST`, `PUT`, and `DELETE /api/tasks`
- `GET`, `POST`, `PUT`, and `DELETE /api/budgets`
- `GET`, `PUT /api/profile`
- `POST /api/auth/register`
- NextAuth handlers at `/api/auth/[...nextauth]`

Request bodies for writes are validated with Zod. `PUT` transaction and task requests include an `id`; deletes use an `id` query parameter. Budget `POST`/`PUT` upsert the monthly limit for a category.

## Security and currency

Finance pages are guarded by middleware, and all finance APIs derive ownership from the authenticated NextAuth session. Use HTTPS, a strong unique `NEXTAUTH_SECRET`, rate limits on registration/sign-in at the hosting edge, and managed PostgreSQL backups for deployment. The demo credentials are intentionally public and must never be treated as secure user credentials.

The ETB/USD/EUR selector controls the display currency. Wallet balances and transaction totals are converted using cached live exchange rates; transaction amounts are stored in the currency of their selected wallet. Quotes are supplied by the open.er-api.com service and may be temporarily unavailable.
