# Category Store membership cut-over

Status: live reset, membership migration and test-account seeding completed on
19 November 2026 through Supabase MCP, following explicit owner authorization.
The matching application release is `68f8866`; its Vercel production deployment
succeeded. Both existing Auth accounts, identities, profile/locale metadata and
Storage were retained. Current-month active budgets and active recurring rules
block category removal.

## Matching release and schema

The application uses `user_categories.id` throughout, exposed as
`user_category_id` in transaction, budget, recurring, import and bulk requests.
Store templates live in `categories`; only adoption creates optional links.
The manifest is `src/lib/category-catalog.json` (85 templates, 12 collections).
The seed section of `20261119090000_user_categories.sql` must match it.

Removed categories retain identity, appearance, explicit names and history.
Active dependencies block removal; restore does not resume paused records.
Retired templates remain readable and usable through existing active links;
new adoption and reactivation require an available template. Private categories
restore independently of the catalog. System categories remain active.

The old `category_id`, copied-category, and `adopt_category(uuid)` contracts are
retired by the cut-over. Web and API changes must deploy together. iOS/direct
clients must be updated or remain disabled. The old hidden-category table stays
empty, retained for a separately reviewed cleanup.

## Exact destructive scope for approval

Project observed: Personal Finance (`lasntpiwnnvlohhaispo`). Read-only inventory
on 19 November: 2 Auth accounts, 407 transactions, 10 wallets, 57 categories.
Recount immediately before execution; these counts are not reset conditions.

`category-store-reset.sql` deletes rows from exactly these public tables, in
order: `bank_statement_imports`, `transactions`, `debt_payments`, `debts`,
`budgets`, `recurring_transactions`, `saving_goals`, `wallets`,
`ai_insights_cache`, `net_worth_snapshots`, `notification_states`,
`user_hidden_categories`, and `categories`.

It does not drop databases, use TRUNCATE CASCADE, or change Auth accounts,
identities, credentials, user metadata/profile/locale settings, Storage objects,
buckets/policies, project settings, API keys or migration history. The matching
migration removes obsolete category columns and replaces financial category
foreign keys, guards and RPCs. It seeds the catalog only. Both existing accounts
start without wallets or financial records; no optional category is auto-added.

## Preparation gates

1. Review the reset SQL, migration, manifest and matching application diff.
2. Capture the current public/Auth schema and data, Auth identities and migration
   history. Inventory Storage bytes and project configuration separately. Restore
   the backup into an isolated environment and verify both sign-ins. The captured
   public baseline is a schema rehearsal artifact, not a backup of credentials,
   Auth, Storage, data, or project configuration.
3. Rehearse the public baseline plus target migration on an empty isolated
   Supabase/PostgreSQL database. Review RLS and permissions, adoption/retry/batch
   rollback, custom/system creation, removal dependencies, inactive existing
   edits, debt/reconcile flows, import, bulk, budget rollover and the generator
   manually. This project does not add or run automated tests.
4. Inventory and stop every writer: web/API, iOS/direct clients and jobs. The
   observed cron is job 1, `process-recurring-daily`, command
   `SELECT process_recurring_all_users()`, schedule `5 17 * * *`, active=true.
   Re-read live job state and record it; do not blindly resume every job. Keep
   scheduled jobs, webhooks and integrations disabled on any restored sandbox.
5. Obtain explicit execution approval for the concrete scope above. If any
   writer cannot be stopped or the backup cannot be restored, do not reset.

## Execution after approval

Take the final backup after writes stop. Use a privileged database connection
and `psql -v ON_ERROR_STOP=1`; keep reset, schema change and postconditions inside
one explicit transaction. Paths below are relative to the repository root:

```sql
BEGIN;
SET LOCAL app.category_reset_approved = 'clear_financial_data_keep_auth';
\i supabase/operations/category-store-reset.sql
\i supabase/migrations/20261119090000_user_categories.sql
-- Compare retained Auth IDs, identities, metadata and Storage inventory with
-- the final backup; confirm all cleared tables and user_categories are empty.
COMMIT;
```

The approval setting is an operator acknowledgement, not an access control.
Record the migration in Supabase migration history using the project's chosen
migration mechanism in that same deployment. Do not replay the migration after
this manual execution. If any SQL fails, abort the entire transaction; never
commit the reset alone. For a fresh isolated public schema, first apply
`supabase/baselines/20261119_pre_membership.sql`; Supabase roles and Auth schema
must already exist. The baseline deliberately schedules no cron jobs.

Deploy the matching web/API release while writers remain stopped. Verify both
existing logins, empty ledger, catalog availability, schema/API contracts and
language handling. Do not run `seed/test-data.sql` on the freshly cleared
main ledger; it is a separate, explicitly authorized fixture operation.
Re-enable only previously enabled jobs after checking their functions and
credentials. The replacement generator skips paused rules, uses memberships,
locks rules/wallets, validates balances, and rolls back a failed rule's posting.

## Rollback

Before commit, roll back the SQL transaction. After commit but before reopening
writes, keep maintenance enabled and restore the validated backup together with
the old application revision (`ad9d48a` was the checked-out base for this work).
After writes reopen, an old snapshot would discard new entries: prefer a forward
fix or obtain a separate capture/reconciliation plan. Retain the verified backup
until acceptance and retention requirements are settled.

## Verification recorded for this implementation

- Lint, TypeScript and production build passed. No automated test suite was
  added or run, following the repository's manual-testing policy.
- The captured baseline and final migration applied successfully to an empty
  isolated PostgreSQL 17 database. A second rehearsal exercised the explicit
  financial reset with synthetic rows: both mock Auth IDs remained unchanged,
  ledger rows were cleared, 85 templates existed and memberships started empty.
- Manual SQL sessions covered adoption/retry, atomic batch failure, private
  creation, transaction create/update, debt creation/addition/payment,
  reconciliation, CSV import, bulk recategorization, dependency refusal,
  inactive existing edits, rejection of new inactive references/reactivation,
  personal rename preservation and cross-owner isolation. The generator skipped
  paused rules, posted one due rule including its fee, advanced the schedule,
  updated the balance and produced no second posting on a repeated run.
- These sessions used mock Auth scaffolding, not a full Supabase Auth server.
  Real sign-in, browser/mobile layout, live PostgREST embedding, production
  backup/restore, retained Storage/configuration and other concurrent-session races
  remain unverified. They must be checked before live acceptance and reopening.

## Follow-up review fixes

Reconciliation now reuses the shared category selector, excludes removed/debt
choices, and rejects debt categories inside the RPC. A manual SQL reproduction
confirmed that the old function created an unlinked `lend_out` entry; the fixed
function rejected it without changing the balance. Ordinary income and balance
corrections still succeeded.

The generator orders candidates by wallet ID across the entire run and skips
rules whose wallet changed after the candidate snapshot. Two concurrent SQL
sessions reproduced the old deadlock against `transfer_funds`; the same sequence
with the fixed generator completed the transfer and both due rules. Fees,
balances and schedules matched, paused rules stayed paused, and a repeated run
created no extra postings.

Quick Add filters removed/debt categories before ranking and limiting results.
A direct evaluation with five removed categories and one debt category ahead of
five eligible categories returned all five eligible suggestions. Debt API routes
now delegate system-category provisioning to their money RPCs, and category
projections are centralized in `src/lib/category-columns.ts`.

## Live execution record — 19 November 2026

All live database operations used Supabase MCP. Client financial writes were
temporarily disabled through grants, and the previously active cron job 1 was
paused. The final logical snapshot was restored on isolated PostgreSQL 17:
fingerprints for all 13 public tables and both Auth users/identities matched.
The reset, target schema and current `seed/test-data.sql` then passed rehearsal
against that restored dataset. Both avatar files were also backed up locally.

The actual reset, migration and test seed committed together with retained-data,
ownership and seeded-count assertions. The resulting catalog has 85 templates.
`test@gmail.com` has 166 transactions, 4 wallets, 21 user categories, 16 budgets,
4 recurring rules, 3 debts and 3 savings goals. The other retained account has
no financial data or optional category memberships. RLS reads confirmed account
isolation. Auth user/identity and Storage metadata fingerprints stayed unchanged.

MCP recorded `20261119035437_category_store_maintenance`,
`20261119040109_user_categories`, and `20261119040229_category_store_reopen`.
The schema source remains `20261119090000_user_categories.sql`; do not replay it
against this already migrated project. The maintenance/reopen entries record the
temporary permission changes. Target grants were verified and restored before
reopening; cron job 1 alone was resumed, preserving its original schedule.

The protected backup is outside Git at
`/Users/nghiabui/.codex/backups/personal-finance/category-store-20261119-mq72i537/`.
It contains public data/schema, Auth users/identities, migration history, Storage
metadata/avatar bytes and the exact applied SQL. It is a scoped logical backup,
not a complete hosted-project/configuration or Auth-service snapshot. A full
Auth service was not started during rehearsal, and real password sign-in was
not repeated. No Auth credentials or project configuration were changed.
