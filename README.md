# Personal Finance

A personal finance app for a single user. Income/expense tracking, wallets, budgets, debts, savings goals, reports, and AI-powered spending analysis.

## Tech Stack

- **Node 22+** (see `.nvmrc`)
- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth) — every query goes through a client bound to the user's session, protected by Row Level Security on every table
- **Groq** (`openai/gpt-oss-120b`) for AI spending analysis and free-text transaction parsing
- **pnpm**, deployed on Vercel + Supabase

## Features

**Money in and out**

- Income/expense transactions, transfers between wallets, bank fee folded into the transaction it belongs to
- Log a transaction from one line of text — `cà phê 35k vcb`, or a pasted bank SMS — parsed into a filled-in form you confirm
- One-tap chips for the spends you repeat, drawn from your own last 90 days
- A wallet can't be spent past what it holds; the shortfall is shown as you type
- Filter by direction, category, wallet and amount range; search notes across all time
- The category a note was filed under last time is offered as you type — in the
  form and on each row of a CSV import. Offered, never applied on its own
- Same day, same wallet, same amount as something already recorded? The form
  says so before you save it twice
- Deleting a plain transaction happens at once, with **Undo** in the toast.
  Transfers and debt repayments still ask first: undo cannot rebuild the record
  on the other side
- **Select** turns the list into checkboxes — move a batch to one category, or
  delete a batch in a single database transaction
- Import a VCB CSV statement: map columns, review titles/categories, skip rows,
  then confirm the batch before reconciling the bank wallet

**Accounts**

- Wallets: cash, bank, e-wallet, investment, **credit card** (credit limit, statement day, due day)
- **Reconcile** against the real bank balance — the gap is filed as an adjustment transaction, so history still adds up and the drift stays visible
- Custom categories (icon, color)

**Planning**

- Monthly budgets with over/under tracking, optional **rollover** (unused amount carries forward, overspend is deducted) computed at read time
- **Suggested budgets** from the median of your last 3 months, so the first budget is a confirmation rather than a guess
- Budgets can be paused without losing their history
- Recurring transactions (daily/weekly/monthly/yearly) that run nightly via `pg_cron` — no need to open the app. Pause, resume, or skip one occurrence; resuming never backfills missed periods
- Savings goals, debts (lend / borrow) with partial payment history

**Seeing where you stand**

- Every screen opens with a sentence, not a number: *"You're spending 12% faster than your 3-month average."* The figures below it are the evidence
- Dashboard: spending pace vs your own trailing average, net worth breakdown, spending by category, budget alerts
- Reports: week/month/quarter/year, income vs expense chart, net worth history, CSV export
- Income, spending, savings rate, budgets and AI comparisons exclude loan principal, transfers, credit card principal payments and balance corrections. Reports and CSV show debt cash flow and balance adjustments separately; interest and fees remain income/spending.
- **AI Insights**: spending analysis, comparison against any earlier period you pick, budget and balance-sheet health (emergency fund runway, credit utilization), scored per period type — a week isn't marked a deficit just because salary hasn't landed yet

## Project Structure

```
src/
├── proxy.ts             # route guard (Next 16's renamed middleware).
│                        # MUST sit beside app/ — at the repo root it silently
│                        # never runs.
├── app/
│   ├── (auth)/          # login, register, forgot/reset password
│   ├── (app)/           # dashboard, transactions, budgets, wallets, debts,
│   │                    # recurring, reports, saving-goals, categories, settings
│   ├── api/             # mutations + a few client-initiated reads,
│   │                    # each wrapped by withAuth/withRoute
│   └── auth/callback/   # Supabase OAuth/recovery code exchange
├── components/ui/       # shared components (modal, toast, select, verdict...)
└── lib/
    ├── supabase/        # client.ts (browser), server.ts (server/RLS-scoped)
    ├── server/          # auth.ts, route.ts, and the read-time calculations:
    │                    # budget-rollover, spending-pace, budget-suggestions,
    │                    # net-worth, wallet-balance, frequent-transactions
    ├── api/             # per-domain fetch wrappers (wallets, debts...)
    └── utils/           # date.ts (timezone-aware), currency.ts, period.ts...

supabase/
├── migrations/          # schema (see the caveat under Setup)
└── seed/                # re-runnable reset for the test account
```

### How data flows

**Reads go straight to Supabase from Server Components.** Pages call
`requireUser()` and query directly — RLS scopes every row to the session, so an
API route in between would add a hop without adding safety.

**Writes go through `src/app/api/`.** Mutations need validation, atomic balance
updates via the `adjust_wallet_balance` RPC, and multi-step work (a debt payment
touches three tables). Those live server-side, called from the client.

The only GET endpoints left are the reads a Server Component can't do:
pagination as you scroll a wallet, the notification bell, the CSV download, and
the comparison period the AI picker fetches on demand. The iOS client queries
Supabase directly too.

### Mobile vs desktop

Creating a transaction opens a **full page** on a phone (`/transactions/new`)
and a **dialog** on desktop. The form is one shared component; only the wrapper
differs. Editing is always a dialog.

**On a phone**

- Installable to the home screen, where it opens without browser chrome. Add it
  from the browser's share menu; no store, no build step

## Getting Started

### 1. Node and dependencies

```bash
nvm use          # reads .nvmrc → Node 22
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

`NEXT_PUBLIC_TIMEZONE` is the app's "ledger timezone" — every transaction date,
budget cycle, and the recurring-transaction cron computes dates in this zone
regardless of where the app runs, so data never shifts by a day when you travel.

### 3. Database

> **The migrations in `supabase/migrations/` are incomplete.** The live schema
> has picked up changes applied straight to the project — `ai_insights_cache`,
> `transactions.bank_fee`, `transactions.transfer_pair_id`, and
> `budgets.rollover` among them. Applying only these files gives you a database
> the app cannot run against.
>
> To stand up a fresh project, dump the schema from the working one
> (`supabase db dump --schema public`) rather than replaying this folder. New
> schema changes should land here as a migration.

The nightly `pg_cron` job that generates recurring transactions
(`process-recurring-daily`, 00:05 in the ledger timezone) is also configured on
the project rather than in this folder.

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Import VCB statements

Open **Transactions → Import CSV**. Choose a bank wallet and a **CSV UTF-8**
file (up to 1 MB and 500 transactions). Excel workbooks must first be exported
as CSV; `.xls`/`.xlsx` files are not supported directly.

Choose the separator and header row, then map transaction date, bank
description, debit, credit, and preferably the bank reference. Dates accept
`DD/MM/YYYY` or `YYYY-MM-DD`; choose the decimal separator to match the file.
Blank records are ignored; remove statement totals/footer records beforehand.
`tests/fixtures/vcb-statement.csv` is a synthetic example of the supported
layout, not a verified export from Vietcombank.

Review every selected row and enter its title. The title uses the existing
transaction `note` field; original bank descriptions and references are retained
separately. Uncheck transactions already entered manually, transfers, and debt
payments: importing them as new rows would count them as income or spending.
The importer does not automatically match manual entries or create transfers.

Confirming the batch creates transactions through the existing money function.
Transactions, duplicate identities, and wallet changes commit together or all
roll back. The wallet must have sufficient funds as transactions are applied
oldest first (income before expenses on the same day). Set the correct opening
balance before importing a historical statement. The import never overwrites
the wallet balance; reconciliation remains a separate confirmation against a
bank balance from the same point in time.

Bank reference keys prevent repeat imports into the same wallet, including
after a recorded transaction is edited or deleted. Without references, keys use
date, direction, amount, description, and the occurrence number of identical
rows. Identical transactions across partially overlapping files cannot always
be distinguished; review these files carefully and prefer bank references.

Apply `supabase/migrations/20261023000000_bank_csv_import.sql` before using the
importer. It adds an RLS-protected identity table and atomic import functions;
it relies on the existing money functions and live schema described above.
No bank credentials, API keys, or new environment variables are needed.

Parser checks: `node --experimental-strip-types --test tests/bank-csv.test.mjs`.
`tests/bank-import.sql` covers atomicity, retries, ownership, category checks,
and deleted-entry retries. Run it as postgres only against a disposable local
Supabase database with the complete schema and migrations; it rolls back its
fixtures. Do not run it against the live database.

## Tests

```bash
node --experimental-strip-types --test tests/bank-csv.test.mjs          # CSV parser
node --experimental-strip-types --test tests/transaction-matching.test.mjs  # category suggestion, duplicate check
node --experimental-strip-types --test tests/rpc-params.test.mjs         # request body → money function arguments
node --experimental-strip-types --test tests/totals.test.mjs             # income/expense totals, net, debts owed
node --experimental-strip-types --test tests/currency.test.mjs           # signed amounts
```

`tests/bank-import.sql` and `tests/bulk-delete.sql` cover the money functions —
atomicity, retries, ownership, and the balance after a refused batch. Run them
as postgres against a disposable local Supabase database with the full schema;
each rolls its fixtures back. Do not run them against the live database.

Apply `supabase/migrations/20261110000000_bulk_delete_transactions.sql` before
using batch delete. It adds `delete_transactions(uuid[])`, which loops the
existing `delete_transaction` inside one transaction.

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
- `src/proxy.ts` redirects unauthenticated requests before a page renders. It works from an allow-list: anything not listed as public requires a session.
- IP-based rate limiting on `sign-in`, `sign-up`, `forgot-password`.
- Security headers (CSP, X-Frame-Options, HSTS...) configured in `next.config.ts`.
- **Leaked Password Protection** is worth enabling under Supabase → Authentication → Sign In / Providers → Email. It requires the Pro plan; on Free, raise the minimum password length and required character types on the same page instead.

## License

MIT — see [LICENSE](LICENSE).
