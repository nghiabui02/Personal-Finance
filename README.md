# Personal Finance

A personal finance app for a single user. Income/expense tracking, wallets, budgets, debts, savings goals, reports, and AI-powered spending analysis.

## Tech Stack

- **Next.js 16** (App Router) + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth) — every query goes through a client bound to the user's session, protected by Row Level Security on every table
- **Groq** (`openai/gpt-oss-120b`) for AI spending analysis
- **pnpm**, deployed on Vercel + Supabase

## Features

- Sign up / sign in, change password, change email
- Wallets: cash, bank, e-wallet, investment, **credit card** (credit limit, statement day, due day)
- Income/expense transactions, transfers between wallets, bank fee for international transactions
- Custom categories (icon, color)
- Monthly budgets with over/under tracking
- Recurring transactions (daily/weekly/monthly/yearly), auto-run nightly via `pg_cron` — transactions get created without opening the app
- Debts (lend / borrow) with partial payment history
- Savings goals
- Dashboard: income/expense/net worth overview, spending-by-category chart, budget alerts
- Reports: view by week/month/quarter/year, income vs expense chart, net worth history, CSV export
- **AI Insights**: spending analysis, comparison with the previous period, budget and balance-sheet health (emergency fund runway, credit utilization), adapts scoring per period type (a week isn't scored as a deficit just because salary hasn't landed yet)

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # login, register, forgot/reset password
│   ├── (app)/           # dashboard, transactions, budgets, wallets,
│   │                    # debts, recurring, reports, saving-goals, settings
│   ├── api/             # API routes, each wrapped by withAuth/withRoute
│   └── auth/callback/   # Supabase OAuth/recovery code exchange
├── components/ui/       # shared components (modal, select, date picker...)
└── lib/
    ├── supabase/        # client.ts (browser), server.ts (server/RLS-scoped)
    ├── server/          # route.ts (auth wrapper), rate-limit.ts, net-worth.ts...
    ├── api/             # per-domain fetch wrappers (wallets, debts...)
    └── utils/           # date.ts (timezone-aware), currency.ts, credit.ts
```

## Getting Started

### 1. Install

```bash
pnpm install
```

### 2. Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Ho_Chi_Minh
GROQ_API_KEY=
```

`NEXT_PUBLIC_TIMEZONE` is the app's "ledger timezone" — every transaction date, budget cycle, and the recurring-transaction cron all compute dates in this timezone regardless of where the app is running, so data never shifts by a day when the timezone changes.

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Webpack) |
| `pnpm dev:turbo` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |

## Security

- **RLS enabled on every table**, every policy scoped to `auth.uid() = user_id` — even if an API route forgets to filter by user, the database still blocks cross-account access.
- No code path uses the Supabase Service Role Key — every query goes through the session-bound client, so RLS is always enforced.
- IP-based rate limiting on `sign-in`, `sign-up`, `forgot-password`.
- Security headers (CSP, X-Frame-Options, HSTS...) configured in `next.config.ts`.
- Consider also enabling **Leaked Password Protection** in Supabase Dashboard → Authentication → Passwords.
