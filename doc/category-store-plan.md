# Category Store Plan

Planning date: 18 November 2026. Status: planning only; deferred until localization is complete. No implementation or migration is authorized by this document.

## 1. Confirmed Scope and Sequence

1. Complete both phases of the existing [Vietnamese/English localization plan](localization-plan.md) first, using the current shared default category model.
2. Ship **Hide defaults** (section 1.1) and **Debt categories require a debt** (section 1.2) as the first, small steps. They solve "default categories I never use clutter my lists" and "debt categories used without a debt" without copying categories or migrating references.
3. Implement Category Store later as a separate feature, after explicit implementation authorization.

### 1.1. MVP: Hide Default Categories

- Shared default rows cannot hold per-user state, so add `user_hidden_categories (user_id, category_id, primary key (user_id, category_id))` with RLS restricted to own rows. The `category_id` must reference a shared default (`user_id IS NULL`); system categories cannot be hidden.
- Hidden defaults disappear only from choices for new records: create forms, category tiles, quick add, and AI parser candidates. History, reports, budgets, and recurring rules that already reference them stay unchanged and keep displaying them.
- Search and filter screens for history keep listing hidden defaults that have been used, so past transactions stay findable.
- Edit forms for existing transactions, budgets, and recurring rules keep their current category selected and listed even if it is hidden. Saving without changing it must not fail or clear it.
- The Categories screen lists hidden defaults in a collapsed "Hidden" group with a Show action. Hiding a default that an active budget or recurring rule uses shows a warning; it does not block.
- No category IDs, transactions, or budgets change. Rollback = drop the table.
- When the Store ships, this table defines the legacy transition: visible defaults = available, hidden = not adopted. Section 5 still needs explicit confirmation.

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

The Store provides a system-maintained catalog of category templates. Users choose which templates to add to their personal categories and can still create private custom categories.

Confirmed naming rules:

| Category origin | Display name | After the user renames it |
|---|---|---|
| Adopted from Store | Follows the current UI language: Vietnamese or English | Keeps the user's chosen name across language changes |
| Created by the user | Keeps the user's name; no automatic translation | Keeps the updated user-defined name |
| Internal system category | Keeps the localization behavior delivered by the earlier plan | Preserves explicit user renames under that plan |

The Store is not required to complete localization. Its UI, adoption workflow, data changes, and rollout belong to this later feature.

## 2. User Experience

- The Categories screen retains a clear action to create a custom category and adds a separate action to browse the Store.
- The Store lists available templates with an icon, color, income/expense type, and localized name. An initial catalog can reuse the existing 13 default categories; expanding the catalog is not required for the first version.
- Users can browse by income/expense type and add individual templates they need.
- Adding a template creates a personal category; the template is not modified and other users are unaffected.
- An already adopted template shows an Added state. Repeated clicks, retries, or concurrent requests must not create duplicate personal copies.
- Only adopted categories, private custom categories, and applicable internal system categories appear in new-entry selectors once the Store model is enabled. Catalog templates are not automatically selected for a new user.
- A category adopted without a custom name follows the UI locale everywhere, including transaction history, budgets, charts, notifications, CSV, and AI.
- Renaming an adopted category makes its name user-defined. Later language changes do not translate or overwrite it. Changing only its icon or color must not freeze its name.
- User-created custom categories remain private and are never published to the Store.
- The empty state offers both Browse Store and Create custom category.

Example: a user adds the `food_drink` template. It displays as “Ăn uống” in Vietnamese and “Food & drink” in English. If renamed to “Ăn ngoài”, that exact name is displayed in both languages. Another user's copy continues following their own language preference.

## 3. Proposed Data Approach

This is a design direction, not a final schema or executable migration.

- Reuse the stable category translation keys, dictionaries, and shared display-name resolver delivered by localization.
- Prefer reusing verified shared default rows as catalog templates rather than introducing a second catalog with the same data. Confirm suitability against the actual schema before choosing the final storage layout.
- Adopting a template creates a user-owned category with its own ID and a stable reference to its source template. Transactions and budgets reference the user's category ID.
- The reference preserves access to the template's translation key. Do not duplicate a category for each language or copy both language labels into each user's row.
- Reuse the localization plan's `name_is_custom` column and its `BEFORE UPDATE` trigger for adopted categories. An adopted copy starts with `false`; a rename sets it to `true` from any client. Preserve template provenance when the user renames a personal copy.
- Copy the template's type, icon, and color when adding it. Subsequent catalog edits must not overwrite a user's icon, color, or custom name. Template label translations remain the source for names that have not been customized.
- Enforce at most one personal category per user/template reference, including after renaming. This rule must hold under concurrent requests, not only through a disabled button. Concretely: a partial unique index on `(user_id, source_template_id) WHERE source_template_id IS NOT NULL`, plus `insert … on conflict do nothing`, followed by selecting the existing row. A retry then returns the same ID.
- Avoid the “two Ăn uống” problem. If shared rows stay selectable for legacy reasons and the user also adopts a copy, selectors show both. Section 5 must settle which one is selectable.
- Do not identify templates or detect duplicate adoption by display name. A private category named “Ăn uống” does not automatically become an adopted template.
- Keep the six internal debt/balance-adjustment categories separate from optional Store templates. Preserve their `system_key` accounting behavior and existing creation paths.
- Aggregate and match by category ID, never by translated name.

## 4. Access and Mutation Rules

- Users may read the system catalog and manage only their own personal categories.
- Users cannot edit catalog templates, publish custom categories, change another user's adopted copy, or assign arbitrary ownership/template metadata through the custom-create endpoint.
- The adoption operation accepts a template identifier, verifies that it is an eligible catalog template, and derives the personal category fields on the server.
- Validate income/expense type, template eligibility, ownership, and duplicate adoption at the mutation boundary. Enforce ownership in the database as well as the application.
- Failed adoption must not leave a partial category. Retries return the already adopted category or an equivalent stable result.
- Update transaction, budget, recurring, import, AI, and money-function validation so new records cannot use an unadopted catalog template directly after rollout. Keep historical reads compatible with the approved legacy-data transition.
- RLS lets every user read `user_id IS NULL` rows (needed for browsing), so knowing a template ID is enough to reference it. Per-route checks would miss some of the many write paths: money RPCs, CSV import (`bank_csv_import.sql` only checks that the category exists), bulk recategorize, and the iOS client writing directly. Enforce the rule in one place instead: a trigger on `transactions`, `budgets`, and `recurring_transactions` that rejects new or changed `category_id` values pointing at a template row, applying only from the cut-over onward.
- Recurring rules generate new transactions, and the generator is not in this repository (cron/job outside the source). A legacy rule that still points at a shared row would produce inserts the trigger rejects. Before enabling the trigger, the approved transition must remap every `recurring_transactions.category_id` that references a template to that user's personal copy, in the same migration, and verify zero remaining template references. Do not add a trigger exemption for the generator. Rehearse one generator run on the test database after the remap.
- Budgets cannot be remapped on their own. `budget-rollover.ts` computes `spent` by summing transactions with the budget's `category_id`, and computes `rolloverCarry`/`effectiveAmount` at read time from earlier months. Moving only the budget would show `spent = 0` and drop the carried surplus/deficit. Rule: for a given user and template, transactions, budgets (every month), and recurring rules move together, in one migration, or none of them move. A user with an active recurring rule or budget on a template therefore has that template's whole reference set moved.
- Verification for the remap: for every affected budget, `spent`, `rolloverCarry`, and `effectiveAmount` are identical before and after; per-category report totals are unchanged.
- Preserve existing authentication, RLS, financial validation, locking, and atomicity. This feature must not change wallet balances or cash-flow classification.

## 5. Existing Data and Decisions Required Before Implementation

Existing shared default categories may already be referenced by transactions, budgets, and recurring rules. Changing which categories are selectable must not erase or split those histories.

Before implementation:

- Inventory the actual schema, shared default rows, private categories, internal system categories, and every referencing table/client. The README warns that repository migrations are incomplete.
- Choose and confirm how existing users transition: preserve access to all previously available defaults, or adopt only the defaults they have used. Neither policy is assumed approved.
- Determine whether legacy references stay attached to readable shared rows or move to personal copies. If references move, document the per-user mapping and update every dependent reference atomically, including conflicting budget constraints and parent-category links where applicable. Partial moves are not allowed (see section 4): per user and template, transactions, budgets, and recurring rules move together or stay together.
- Preserve existing custom names. Do not infer template origin or rename intent from matching text alone.
- Confirm what removing an adopted category means when it is referenced: hide it from future selection, or use the existing deletion behavior with its explicit consequences. Existing foreign keys: `budgets.category_id` is `on delete cascade` (deleting the category deletes its budgets); `transactions`, `recurring_transactions`, and `categories.parent_id` are `on delete set null` (history becomes uncategorized). This plan does not introduce an unapproved deletion or archive policy.
- Define re-adoption behavior after removal, including whether an existing category ID is restored. Do not silently reconnect or rewrite historical transactions.
- Confirm the effect of retiring a template on browsing, future adoption, and already adopted copies. Existing history must remain readable.
- Recheck the earlier localization implementation before writing Store migrations; reuse the fields and helpers actually delivered rather than assuming proposed fields already exist.

Do not delete shared categories or migrate user references until the chosen transition has been reviewed and explicitly authorized. Rehearse migrations on a test database, verify before/after counts and financial totals, and document rollback compatibility.

## 6. Implementation Stages and Verification

| Stage | Deliverable | Verification |
|---|---|---|
| 0a. Debt categories require a debt | Form/recurring/AI/bulk changes and `create_transaction`/`update_transaction` checks from section 1.2 | Cho vay/Đi vay only through debt creation; Thu nợ/Trả nợ cannot be saved without a matching debt; bulk route rejects a debt category; legacy unlinked rows still editable without changing category; debt-category rows ask before deleting and show no Undo; recurring rules with a debt category are paused, cannot be reactivated unchanged, and a rehearsed generator run creates nothing for them; `create_debt`, `record_debt_payment`, `add_to_debt` unchanged; balances unchanged |
| 0b. Hide defaults (MVP) | `user_hidden_categories`, Hide/Show on the Categories screen, create-form selectors filter hidden defaults | Hidden defaults absent from create forms and AI candidates; still present in history filters and in edit forms that already use them; history, reports, budgets, and recurring rules unchanged; another user unaffected |
| 1. Readiness and decisions | Localization completed; legacy adoption/removal policies settled; actual schema and callers inventoried | Naming rules and data mapping reviewed; no Store changes deployed |
| 2. Catalog and adoption | Eligible templates, personal source reference, ownership checks, duplicate protection | Same-user retry/concurrency; two users adopting the same template; invalid template; cross-user attempts; unchanged financial totals |
| 3. Category UI | Browse Store, add/Added states, custom creation, rename behavior, localized empty/error states | Vietnamese/English, mobile/desktop; custom name preserved; icon/color-only edits retain automatic naming |
| 4. Integration and transition | Personal category selection throughout existing flows; approved legacy-data handling | Transactions, budgets, recurring, CSV import/export, notifications, AI, historical reports, and post-save results stay consistent |
| 5. Acceptance | Behavior checks, migration rehearsal, rollback notes, updated documentation | Focused tests plus repository-required lint/typecheck/build; no untranslated Store UI or cross-user exposure |

## 7. Acceptance Checklist

- [ ] Localization is complete before Store implementation starts.
- [ ] No new transaction, recurring rule, or bulk edit can use Cho vay/Đi vay/Thu nợ/Trả nợ without belonging to a debt; legacy unlinked rows remain readable and editable; no Undo path calls `create_transaction` with a debt category; affected recurring rules are paused before the checks go live.
- [ ] Hide defaults ships first; hiding never changes existing references or another user's view, and hidden categories stay usable in history filters and existing edit forms.
- [ ] No recurring rule or budget references a template when the template-reference trigger is enabled; a rehearsed generator run succeeds.
- [ ] Remapped references move as a whole set per user and template; `spent`, `rolloverCarry`, `effectiveAmount`, and per-category report totals match before and after.
- [ ] Users can browse templates, add only those they want, and still create private custom categories.
- [ ] Repeated or concurrent adoption creates at most one copy per user/template.
- [ ] Two users adopting the same template receive independent personal categories.
- [ ] Adopted names follow the UI locale until explicitly renamed; custom names never auto-translate.
- [ ] Editing icon/color alone does not disable localized naming.
- [ ] User edits do not modify the catalog or another user's copy.
- [ ] Custom categories with matching names remain separate and are not auto-linked to templates.
- [ ] All selectors and mutation paths enforce the approved adopted-category model.
- [ ] System categories retain their accounting keys, restrictions, and behavior.
- [ ] Legacy transition, removal/re-adoption, and template retirement policies are confirmed and tested.
- [ ] Existing history, references, budgets, recurring rules, amounts, and balances survive the transition.
- [ ] No implementation, migration, commit, push, or deployment occurs without its applicable authorization.

## 8. Out of Scope and Current Status

Paid categories, a marketplace, user-published templates, sharing custom categories, packs, ratings, automatic translation of custom names, and a catalog administration UI are outside the initial proposal.

This document records the feature and confirmed naming rules only. No app code, schema, or live data has been changed. Actual DB configuration and migration behavior remain unverified. Both this document and the localization plan are under `doc/`, which the repository currently ignores in Git.
