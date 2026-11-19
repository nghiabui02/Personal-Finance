# Category Store Plan

Planning date: 18 November 2026. Architecture revised: 19 November 2026. The earlier Store migration has already been applied; the library expansion and user_categories design below are planning only. This revision does not authorize implementation or another database migration.

## 1. Confirmed Scope and Sequence

1. Preserve the Vietnamese/English naming rules from the [localization plan](localization-plan.md). Sections 1.1 and 1.2 retain the earlier requirements for reference; the hidden-category/debt guard migration and the original Store migration have already been applied.
2. Expand the small starter catalog into a broad library with search and multi-selection.
3. Use user_categories to join users and categories, replacing the original per-user category-copy approach. Prepare the clean-data rebuild selected in section 5; apply it only after the exact reset scope, target schema, and deployment procedure have been reviewed and explicitly authorized.

### 1.1. MVP: Hide Default Categories

- Shared default rows cannot hold per-user state, so add `user_hidden_categories (user_id, category_id, primary key (user_id, category_id))` with RLS restricted to own rows. The `category_id` must reference a shared default (`user_id IS NULL`); system categories cannot be hidden.
- Hidden defaults disappear only from choices for new records: create forms, category tiles, quick add, and AI parser candidates. History, reports, budgets, and recurring rules that already reference them stay unchanged and keep displaying them.
- Search and filter screens for history keep listing hidden defaults that have been used, so past transactions stay findable.
- Edit forms for existing transactions, budgets, and recurring rules keep their current category selected and listed even if it is hidden. Saving without changing it must not fail or clear it.
- The Categories screen lists hidden defaults in a collapsed "Hidden" group with a Show action. Hiding a default that an active budget or recurring rule uses shows a warning; it does not block.
- No category IDs, transactions, or budgets change. Rollback = drop the table.
- This table belongs to the earlier implementation. The revised design uses user_categories.is_active for personal selection state. Preserve historical hidden state during transition; do not drop the old table until compatibility and cleanup are explicitly approved.

### 1.2. Debt Categories Require a Debt

Decided:
- The four debt categories (`lend_out` Cho vay, `borrow_in` Đi vay, `collect_debt` Thu nợ, `repay_debt` Trả nợ) stay as they are today. The app creates them per user on first debt use (`ensureSystemCategory`). They are not Store templates and cannot be hidden.
- Every new transaction using one of them must belong to a debt.

Current gaps (verified in source):
- The transaction form lists all four. Choosing Cho vay/Đi vay creates no debt. Thu nợ/Trả nợ offer a "Not linked" option (`use-transaction-form.ts`), and the debt selector is hidden when editing.
- The recurring form does not filter them, so a recurring rule can generate unlinked debt transactions.
- The AI parser offers them as candidates.
- `PATCH /api/transactions/bulk` filters them only in the client (`selection-bar.tsx`). The server accepts a debt category as the target.
- CSV import already excludes all `system_key` categories, in the client and in the import RPC.

How debt transactions are linked today:
- `record_debt_payment` and `add_to_debt` insert the transaction with `debt_payment_id`.
- `create_debt` inserts the opening Cho vay/Đi vay transaction without any link column.
- So a rule like "debt category requires `debt_payment_id`" would break debt creation. Enforce at the entry points instead.

Changes:
- **Transaction form (create).**
  - Cho vay/Đi vay are not offered; the form shows a “Create a debt” action that opens the existing debt creation flow.
  - Thu nợ/Trả nợ require choosing a debt of the matching direction. Remove "Not linked", and keep submit disabled until a debt is chosen.
  - With no matching active debt, show a message linking to Debts instead of the selector.
- **Transaction form (edit).**
  - An unlinked transaction cannot be switched to a debt category.
  - Linked debt transactions keep their category fixed, as today.
  - Legacy unlinked transactions that already use a debt category stay editable (amount, date, note, wallet) without changing their category.
- **Recurring, AI parser, bulk recategorize.** Exclude the four debt categories from candidates and validate on the server: the recurring create/update routes, parser output, and the bulk route.
- **Server enforcement.** `create_transaction` and `update_transaction` reject a debt-category `category_id` when it is new or changed. They raise a dedicated error that the API maps to a translated message. Debt RPCs insert their transactions directly and are unaffected.
- **Delete and Undo.**
  - Undo restores a deleted row through `transactionsApi.create`, which calls `create_transaction` (`use-transaction-deletion.ts`). The new check would reject it.
  - Only rows where `isStandalone` is true get Undo, and today it only looks at `transfer_pair_id`/`debt_payment_id`. The opening Cho vay/Đi vay transaction from `create_debt` and legacy unlinked debt-category rows still pass.
  - Fix: `isStandalone` also returns `false` when the row's category has one of the four debt `system_key`s. Add `system_key` to the `categories` join of `Transaction`.
  - These rows then follow the existing non-standalone path: confirm before deleting, no Undo toast, and no bulk recategorize.
  - The confirmation text states that the debt record itself is not changed when the row has no `debt_payment_id`.
- **Not covered.** The iOS client writing to `transactions` directly. A table trigger is not used because of the `create_debt` gap above. Revisit if `create_debt` gains a link column.

Existing data:
- Do not create debts for, delete, or recategorize legacy unlinked debt-category transactions or recurring rules.
- List their counts per user during the data review.
- Recurring rules that use a debt category are paused before the new checks go live. Use the existing `active` flag, in the same deploy as, or before, the server validation, so they neither create unlinked debt transactions nor fail on each run.
  - The rule keeps its category, amount, and schedule.
  - The Recurring screen shows why it was paused and asks the user to choose a non-debt category, or to record the payments through Debts.
  - The recurring update route rejects reactivating a rule while its category is a debt category.
- Before rollout:
  - Inspect the live generator (cron/job outside this repository): confirm it skips inactive rules and learn which function it uses to insert transactions.
  - Rehearse one generator run on the test database: paused rules create nothing, other rules still post.
  - Record the paused count per user.

Out of scope: `adjust_up`/`adjust_down` (reconcile-only, not requested), and making the opening transaction follow later edits of the debt amount.


The Store is a broad library of ready-to-use categories. Users browse, search, select categories, and add them to their own active list through `user_categories`. They can also create private custom categories. A small collection of old defaults alone does not meet the requirement.

## 2. User Experience

- Browse income/expense categories by collection and search Vietnamese/English names and aliases with accent-insensitive matching.
- Each template includes a bilingual name, icon, and color. Collections organize browsing; they do not create accounting categories or imply parent/child relationships.
- Add one category directly or select several and press Add selected once. Show selection count, progress, success, and already-added states.
- Adoption creates or reactivates a `user_categories` link. It does not create another `categories` row for a shared template.
- A Store category follows the current UI language unless the user explicitly gives their link a custom name. Private custom category names never auto-translate. Changing icon/color alone does not freeze the name.
- User-defined names and appearance affect only that user's link. Other users and the catalog remain unchanged.
- Catalog additions do not automatically become active for existing or new users. Preserve categories already in use during migration; new adoption is explicit.
- Keep the custom-category creation action and an empty state offering both Browse Store and Create custom category.

### 2.1. Catalog Coverage

The library must cover common everyday needs in enough detail to minimize manual category creation. Review the final list, stable keys, and bilingual labels before seeding it.

| Collection | Example categories |
|---|---|
| Food and drink | Groceries, eating out, breakfast, lunch, dinner, coffee, delivery |
| Transport and vehicles | Fuel, parking, tolls, public transport, taxis, vehicle maintenance, vehicle insurance |
| Home and utilities | Rent, mortgage payments, electricity, water, internet, phone, repairs, household supplies |
| Shopping and personal care | Clothing, shoes, electronics, furniture, cosmetics, haircuts, laundry |
| Health | Medical visits, medicine, dental care, glasses, health insurance |
| Education and work | Tuition, books, courses, stationery, work tools, professional memberships |
| Entertainment and subscriptions | Movies, games, music, streaming, hobbies, gym, events |
| Travel | Accommodation, flights, tours, travel insurance, visas |
| Family and pets | Childcare, school meals, family support, pet food, veterinary care |
| Gifts and giving | Birthday gifts, wedding gifts, celebrations, donations |
| Fees and obligations | Bank fees, taxes, administrative fees, fines |
| Income | Salary, bonus, freelance work, business income, rental income, interest, dividends, gifts received, refunds |

Favor recognizable choices over near-duplicates. General and specific alternatives may coexist; users choose their preferred detail. Keep the catalog in a reviewed repository manifest with stable keys, collection, type, Vietnamese/English labels and search aliases, icon, and color. No catalog administration screen is required. Debt and balance-adjustment categories remain internal and are not optional Store entries.

### 2.2. Remove and Restore

- Add Remove from my categories for adopted and private custom categories. Set the user's link inactive; retain the category, link, and all history.
- Removed categories disappear from the active list, new transaction/budget/recurring choices, quick add, imports, AI candidates, and bulk recategorization targets.
- Historical transactions, reports, budgets, and filters still display the category with that user's name. Existing records can retain an inactive category when edited; other records cannot newly select it.
- Show removed personal categories in a Removed section. Store entries offer Add again; private categories offer Restore. Reactivate the same link with the user's name and appearance intact.
- Never route removal through the current physical DELETE endpoint. Existing foreign keys can delete budgets or clear transaction and recurring references when a category row is deleted.
- Active dependencies require a decision before implementation. Proposed safe default: block removal while active recurring rules or current active budgets use the category, list those dependencies, and let the user pause or change them first. Do not silently pause rules, delete budgets, or recategorize history. Check concurrent writes atomically.
- Restoring a link does not resume budgets or recurring rules the user previously paused. Internal system categories cannot be removed.

## 3. Confirmed Data Model

The final model has three distinct responsibilities:

```text
categories (Store templates)
    1 ─── N user_categories (a user's adopted, custom, or internal category)
                1 ─── N transactions
```

`user_categories.user_id` references Supabase `auth.users(id)`. Do not introduce a second user table.

### categories: Store Templates Only

- One row per reusable Store template, containing a stable translation key, income/expense type, default bilingual naming metadata, collection, icon, and color.
- No personal copies, private custom categories, per-user names, or per-user active state belong in the final catalog table.
- The current table still contains legacy personal/system rows and copies. Transition them under section 5; the current mixed table is not the target design.
- Expand the current translation-key CHECK through a new reviewed migration and seed the broad catalog. Do not edit or replay applied migrations.

### user_categories: The User's Categories

Proposed fields:

| Field | Purpose |
|---|---|
| `id uuid` | Primary key; the category identity used by transactions |
| `user_id uuid` | Owner; foreign key to `auth.users(id)` |
| `category_id uuid nullable` | Foreign key to a Store template in `categories(id)`; null for custom/internal categories |
| `name text nullable` | Custom name or explicit personal rename; null means automatic template/system naming |
| `type` | Income/expense type, derived from the template/system key or chosen when creating a custom category |
| `system_key nullable` | Existing debt/reconciliation identity for internal categories only |
| `icon`, `color` | Personal appearance, initialized from a template/system default or user input |
| `is_active boolean default true` | Included in current choices; false means removed |
| `created_at` | When the user's category was created |

Three cases:

| Origin | `category_id` | `system_key` | Name behavior |
|---|---|---|---|
| Adopted from Store | Template ID | null | Translate template unless `name` holds an explicit rename |
| Created privately | null | null | Non-empty `name` required; always preserve the user's text |
| Internal debt/reconciliation | null | Existing system key | Translate by system key unless explicitly renamed |

- Enforce mutually exclusive Store/system provenance and the custom-name requirement with database constraints.
- Unique `(user_id, category_id)` for non-null template IDs, including inactive rows. Unique `(user_id, system_key)` for internal keys. Custom categories with the same name do not become catalog entries or automatic duplicates.
- Adoption inserts a `user_categories` row or reactivates the existing one. It never inserts a personal row into `categories`. Private-category creation inserts directly into `user_categories`, without creating a Store template.
- An explicit rename writes `name`, even if it equals today's translated label. Icon/color-only edits leave it unchanged. Reactivation preserves the same ID, name, and appearance.
- Derive Store type from the template and internal type from its system key. Users cannot forge those origins or change accounting behavior by assigning arbitrary keys/type values.
- Internal system-category helpers provision an owner `user_categories` row automatically. Those categories remain outside the Store and cannot be removed. Retain the six existing `system_key` values and all financial restrictions.

### transactions: Reference the User's Category

- Add `transactions.user_category_id` referencing `user_categories(id)`. A transaction identifies its category through this user-owned row, then joins `categories` only when template metadata is needed.
- Example: two users adopt Coffee. They share one `categories` template ID but have different `user_categories.id` values. Their transactions reference their own values, so personal renames and removal state stay independent.
- Apply the same reference model to `budgets.user_category_id` and `recurring_transactions.user_category_id`, preserving budget matching and recurring generation.
- Enforce owner agreement in the database: unique `(user_id, id)` on `user_categories` and composite foreign keys from each record's `(user_id, user_category_id)` to that pair. A foreign key on the category ID alone would not prevent cross-user references.
- Preserve uncategorized records through nullable `user_category_id`. Reject new or changed references to inactive rows; allow existing records to retain their inactive category when edited.
- All history and name resolution starts from `user_categories`, including custom/internal categories where the Store join is null. Do not filter inactive rows out of historical joins.
- Aggregate by `user_category_id`, never by display name or Store template ID. Budgets, rollover, reports, CSV, AI comparison, notifications, and post-mutation results must use the same identity.

## 4. Access and Mutation Rules

- RLS on `user_categories` permits access only to the owner. The catalog is readable for browsing but cannot be published or edited by ordinary users. An eligible template may be adopted; knowing another user's `user_categories.id` grants no access.
- Updates cannot transfer ownership or change an existing row between Store/custom/internal origins. Personal name, appearance, and active state never modify catalog rows.
- Adoption and restore validate template eligibility and ownership at the mutation boundary. Internal system links are provisioned through existing system flows, not the public Store action.
- Batch adoption is atomic and idempotent: all eligible requested links become active or nothing changes. Already-active links are returned unchanged. Reuse shared adoption logic.
- Removal checks dependencies and new writers under the same locking policy. Removing, restoring, or adopting concurrently must not bypass active-state checks or create duplicate associations.
- Replace the current template-reference guard with owner/active-state validation on `user_category_id` during the coordinated cut-over. New financial records reference user categories, not catalog IDs. Do not remove old guards before the replacement is effective.
- Review all writers: money RPCs, direct inserts, bulk edits, CSV import, recurring generator, private-category creation, and system/debt creation. Preserve authentication, RLS, locks, balance validation, and transaction atomicity.
- Update category queries, mutation responses, Store Added states, and API types together. The current `adopt_category` returns a copied category; it must instead return the user-category identity and display metadata. Category create/edit/remove routes and money RPCs must use user-category IDs. Debt/reconciliation guards must read `user_categories.system_key`. Plan compatibility for other clients before rollout.

## 5. Data Safety and Clean-Data Rebuild

The earlier `20261118110000_category_store.sql` migration has been applied to the project. It created personal copies and remapped existing references. This revision requires a new reviewed migration, not a replay of that file.

### 5.1. Selected Approach: Discard Old Financial Data

Decision, 19 November 2026: the user confirmed that the current financial data is outdated and may be discarded, and explicitly confirmed retaining both existing login accounts. This chooses a clean-data rebuild rather than preserving and remapping the old ledger. Preserve both Auth user IDs, identities, and login credentials; users must not have to register again. It does not authorize an immediate database reset during this planning task.

Read-only inventory at planning time: 2 Auth users, 407 transactions (373 categorized and 34 uncategorized), 10 wallets, 11 budgets, 8 recurring rules, 13 debts, 3 savings goals, and 57 category rows (10 templates, 20 adopted copies, 27 private/internal rows). These are observed counts, not hardcoded reset conditions; recount before execution.

Confirmed account-retention requirement and proposed detailed reset boundary:

| Keep by default | Clear/rebuild after scope approval |
|---|---|
| Auth accounts and identities, account/profile/locale settings, project credentials, Auth configuration, avatar files and storage configuration | Transactions, wallets, budgets, recurring rules, debts and debt payments, savings goals |
| The old database snapshot and matching application revision until the new system is accepted | Bank import deduplication records, AI caches, net-worth snapshots, notification state, hidden-category links, legacy personal/system category rows and adopted copies |
| A reviewed canonical catalog manifest | Seed the broad Store catalog into the new template-only `categories`; start optional `user_categories` empty, provisioning mandatory internal rows only through the required system flows |

Keeping both existing Auth accounts is confirmed. Preserve the current project configuration and profile/storage settings by default; they are outside the financial-data rebuild. Do not delete or recreate Auth accounts or reset their credentials. Removing storage files or creating a paid project requires separate explicit scope. Do not leave stale wallet balances, debt totals, import identities, or caches after clearing the transactions they describe.

#### Preparation and rehearsal

1. Capture the actual schema, functions, triggers, RLS policies, grants, extensions, migration history, and external jobs before designing the rebuild. The repository README states that historical migrations are incomplete: replaying this folder alone is not a fresh-install procedure.
2. Prepare a self-contained, reviewed baseline and migrations for the target model: template-only `categories`, owner-scoped `user_categories`, and financial references via `user_category_id`. Replace all old functions/joins, including debt/system provisioning, import, bulk operations, reporting, and the external recurring generator. Do not merely truncate rows while old RPCs still refer to the old category model.
3. Rehearse the complete baseline on an isolated empty local/test database. Seed the catalog only; use isolated fixtures to test sign-in, adoption, batch adoption, custom creation, remove/restore, cross-user isolation, transaction CRUD, debt flows, recurring generation, imports, and budgets/rollover.
4. Validate a backup by restoring it to a separate isolated environment before touching the current database. Include Auth identities and the migration history explicitly in the restore plan. Storage object bytes and project settings need separate inventory/backup; a database dump alone is not a complete project backup.
5. For sandbox restores, prevent scheduled jobs, webhooks, or external integrations from acting on copied data. Prefer an inspected logical restore when jobs must be disabled before anything runs. A physical project clone may start copied cron jobs immediately; never assume it is inert.

#### Execution on the existing project

The preferred deployment keeps the existing Supabase project and Auth accounts, avoiding new credentials and a second hosted project. A new hosted project remains an alternative if isolation is preferred; review its cost, Auth settings, API keys, storage, and job configuration separately before creation.

1. Prepare the exact SQL, affected-table list, rollback procedure, matching application release, and verified backup. Show this concrete reset scope for explicit execution approval. Do not run a broad reset/drop command or delete Auth users by inference.
2. Enter maintenance and stop every writer: web/API clients, direct/iOS clients, recurring cron, and any other job. Disabling only the web UI is insufficient. Record which jobs were active so only those jobs are resumed later. If writers cannot be stopped, do not proceed with this maintenance-based approach.
3. Take a final backup/snapshot while writes are stopped. Use an explicit dependency-aware table list; do not use an unreviewed `TRUNCATE ... CASCADE` that may reach retained data.
4. In one transaction, clear the approved financial/derived data, build the target schema and constraints, replace functions/guards, seed the reviewed catalog, and perform database assertions before commit. Preserve unrelated tables and Auth/configuration. Any failure aborts the whole transaction.
5. Deploy the matching application while writes remain blocked. Run read-only schema/API checks, verify the intended empty-ledger state and catalog, and verify existing sign-in on the retained accounts. Product behavior requiring sample writes is rehearsed on the isolated test DB, not by inserting financial fixtures into the fresh main ledger.
6. Resume only the previously enabled jobs after their target schema and credentials have been verified, then reopen writes. Existing users see no wallets/transactions and choose their optional categories from the Store. Do not automatically adopt every template for them.

#### Go/no-go checks

- All approved ledger/derived tables are empty; no stale imports, balances, debts, notifications or AI results remain. Both retained Auth user IDs, identities and settings match the pre-reset inventory, and both existing accounts can sign in without registration or password reset.
- The catalog contains the reviewed bilingual templates; `user_categories` supports custom/internal rows and optional adoption without copying templates.
- Every financial reference targets an owner-matched user category. RLS, permissions, unique indexes, active-state guards and dedicated debt guards exist and have passed isolated behavioral tests.
- The old application/RPC contracts are no longer serving writes. Direct clients and the recurring generator have a supported contract or remain disabled.
- Application lint, typecheck, build and focused behavioral tests pass; both languages and representative mobile/desktop flows have been reviewed.
- The backup can be restored, the previous application revision is identified, and the maintenance/rollback procedure has been rehearsed.

#### Rollback limits

Before writes reopen, roll back any failed SQL transaction. If the database change committed but deployment or acceptance fails, keep maintenance enabled and restore the verified pre-reset snapshot together with the matching application. Do not reopen against a half-deployed model.

After users begin writing new data, restoring the old snapshot would discard those new writes. Prefer a forward fix; a restore then needs a separate capture/reconciliation plan for post-cut-over writes. Do not promise lossless rollback after reopening without that plan. Retain the backup until acceptance and retention requirements are explicitly settled.

Official operational references: [Supabase database backups](https://supabase.com/docs/guides/platform/backups), [CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), and [restore to a new project](https://supabase.com/docs/guides/platform/clone-project). Availability, costs, tooling and restore behavior must be verified for the actual project at execution time.

### 5.2. Alternative Only: Preserve the Existing Ledger

This alternative is not selected after the user's decision to discard outdated financial data. Keep it as a fallback if preservation becomes necessary. Existing personal category IDs can be reused as `user_categories.id` after verifying uniqueness; legacy shared references need per-user IDs. This reduces ID churn but does not eliminate the need to update foreign keys, joins, RPCs and all writers together.

1. Inspect the current schema, all clients, and references. Snapshot counts, balances, transaction amounts, budget spent/rollover/effective amounts, and per-category totals.
2. Build an explicit mapping from every old personal-category ID to a new `user_categories.id`. Adopted copies use their existing `source_template_id` as the Store reference. Private custom and internal categories move into owner user-category rows with null Store references. Preserve custom names, system keys, type, icon, and color; do not infer provenance from matching names.
3. Cover legacy shared-category references for each user, preserve active/hidden state, and retain existing adoption choices. Do not automatically adopt the expanded catalog for all users.
4. Add nullable `user_category_id` columns and backfill all transactions, budgets across every month, and recurring rules using the reviewed mapping. Per user and old category, the entire reference set moves together. Update spent/rollover/suggestions/reporting queries to the same identity; partial cut-overs would split history.
5. Validate mapping completeness, duplicate associations, budget uniqueness, ownership, and private/internal origins. Inventory parent links and every other reference; stop for ambiguous mappings.
6. Coordinate application contracts, RPCs, provisioning helpers, constraints, and guard changes. Keep old `category_id` fields and legacy rows only for an explicitly defined compatibility period. If old and new clients coexist, map legacy writes to user-category IDs and prevent divergent references; two independently writable sources of truth are not acceptable. Rehearse the real recurring generator against the new model.
7. Compare before/after values and per-record mappings, including budget spent/rollover/effective amounts. Document reverse mappings and application rollback compatibility.
8. After all callers use user-category IDs and cleanup is separately approved, retire obsolete financial `category_id` fields, old personal/system rows and copy metadata, and the old hidden-category table. The final `categories` table contains only Store templates. Do not physically delete legacy data before compatibility, retention, and rollback requirements are settled.

Removing and restoring uses the same user/category association after transition. Confirm active-dependency behavior and retired-template behavior before implementation. Retirement must preserve existing links and history.

The existing plan and schema can differ; inspect the owning source before migration. Record application compatibility and reverse mappings for rollback. No reference remap or live migration is authorized by this document alone.

## 6. Delivery and Verification

| Stage | Deliverable | Verification |
|---|---|---|
| 1. Catalog and decisions | Review broad catalog, bilingual labels, collection/search metadata, dependency and retirement rules | Practical coverage beyond the starter set; stable keys; no unintended accounting categories |
| 2. Membership model | `user_categories`, RLS, atomic adopt/restore/batch operations, private/system provisioning | Ownership, duplicate retries/concurrency, inactive links, same-value rename, failure rollback |
| 3. Clean-data rebuild | Reviewed target baseline, exact financial reset scope, backup/restore and maintenance procedure, membership constraints and guards | Empty-DB rehearsal; retained Auth/settings; empty approved ledger tables; catalog and all write contracts verified; rollback before reopening rehearsed |
| 4. Category and Store UI | Collections, search, multi-select, Added/Add again, remove/restore, custom creation | Vietnamese/English, accent-insensitive search, mobile/desktop, personal name preservation, dependency messages |
| 5. Integration | Membership-aware categories throughout transactions, budgets, reports, AI, CSV, notifications and post-save responses | History includes removed links; new selections reject them; unchanged amounts, balances, dates and permissions |

## 7. Acceptance Checklist

- [ ] A broad, reviewed bilingual catalog minimizes manual category creation and supports collection browsing and search.
- [ ] Selecting several categories adds them with one action, atomically and without duplicates.
- [ ] Shared templates have one category row each; adoption creates a `user_categories` association rather than a personal copy.
- [ ] `categories` contains only Store templates in the final model; custom/internal categories live in `user_categories` with null template references and the appropriate private name/system key.
- [ ] Transactions, budgets, and recurring rules reference `user_categories.id`; database constraints prevent references to another owner's row.
- [ ] A user's shared category name follows the UI locale until explicitly renamed; custom names and personal appearance survive remove/restore.
- [ ] Users can remove and restore adopted or custom categories without losing history, budgets, category associations, or financial totals.
- [ ] Removed categories remain in historical reads, filters, and unchanged existing-record edits, while new references are rejected at the database boundary.
- [ ] Dependency behavior is confirmed and tested; removal does not silently pause or delete dependent records.
- [ ] Users cannot access another user's memberships, overrides, or private categories; system memberships cannot be deactivated.
- [ ] The clean-data reset follows the explicitly approved table list, preserves retained Auth/settings, clears dependent financial/cache data, and passes all section 5.1 go/no-go checks.
- [ ] If the preservation alternative is selected instead, legacy references move as complete sets and financial snapshots match before and after.
- [ ] Recurring generation, CSV imports, debt flows, bulk mutations and concurrent adoption/removal are tested against the new membership model.
- [ ] Application checks and relevant tests pass; migrations are rehearsed with rollback mappings before live execution.
- [ ] No implementation, migration, cleanup, commit, push, or deployment occurs without its applicable authorization.

## 8. Scope and Status

This revision plans catalog expansion, user/category membership, multi-selection, reversible removal, and the selected clean-data rebuild. Paid categories, user-published templates, sharing private categories, packs, ratings, automatic translation of user text, and a catalog administration UI remain out of scope.

The earlier Store and hidden/debt migrations were applied before this implementation. The user confirmed a clean financial ledger while retaining both login accounts. On 19 November, the user also confirmed blocking removal while current-month active budgets or active recurring rules use the category.

Implementation checkpoint, 19 November 2026: the broad catalog, membership model, Store/category UI and application integrations are prepared in the working tree. The target migration is `supabase/migrations/20261119090000_user_categories.sql`; the exact reset scope, deployment gates and verification evidence are in [the cut-over runbook](../supabase/operations/category-store-cutover.md). The public baseline and migration were rehearsed on isolated PostgreSQL 17, including a synthetic clean-ledger reset. Lint, typecheck and build passed. No live reset/migration, deployment, commit or push has occurred. Live backup/restore, existing sign-in, browser acceptance, direct-client compatibility and concurrent-session verification remain deployment gates; the checklist above is not a claim of completed live acceptance.
