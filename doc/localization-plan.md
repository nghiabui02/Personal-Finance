# System-wide Localization Plan

Review date: 18 November 2026. Status: proposal, not implemented.

## 1. Scope and Proposed Principles

- Confirmed language scope: Vietnamese (`vi`) and English (`en`). Additional languages are outside this phase.
- Translate system-provided content; preserve user-entered content and original bank data.
- UI language, currency, and timezone are separate concerns. Switching to English still uses VND, without currency conversion or changes to ledger dates.
- Decided: VND number formatting stays `vi-VN` (`1.000.000 ₫`) in both languages; only words are translated. See section 4.4.
- Decided: delivery is phased. Phase 1 (MVP) ships the i18n foundation, UI strings, category labels, formatters, and AI output language. Phase 2 covers RPC error codes, generated notes, emails, and PWA. See section 5.
- Preserve the Monday-first week, budget cycles, and existing recurring schedules. Change display labels only.
- Keep existing URLs; do not add `/vi` or `/en` prefixes to the internal application in the initial phase.
- Do not translate technical values stored in the DB/API: `income`, `expense`, `credit`, `lend`, `borrow`, `system_key`, UUIDs, ISO dates, or error codes.
- Translation administration screens, machine translation of user content, and multiple currencies are outside this scope.
- Category Store is a separate feature scheduled after localization; see the [Category Store plan](category-store-plan.md). This phase keeps the existing shared default category model and does not add template adoption, personal copies, or Store-specific migrations. User-created custom category names remain untranslated.

## 2. Current State Verified in the Repository

| Area | Current state | Source |
|---|---|---|
| Platform | Next.js 16.2.9, React 19.2.4; no i18n library in dependencies | [package.json](../package.json) |
| Page language | `html lang="en"`; metadata and PWA description are in English | [layout.tsx](../src/app/layout.tsx), [manifest.ts](../src/app/manifest.ts) |
| Dates and numbers | VND uses `vi-VN`; dates use `en-US`; month/quarter labels and pluralization are manually written in English | [currency.ts](../src/lib/utils/currency.ts), [date.ts](../src/lib/utils/date.ts), [period.ts](../src/lib/utils/period.ts), [plural.ts](../src/lib/utils/plural.ts) |
| Default categories | The initial migration seeds 13 shared categories with Vietnamese names and no dedicated translation keys | [initial_schema.sql](../supabase/migrations/20260613000000_initial_schema.sql) |
| System categories | Six `system_key` values cover debts and balance adjustments; the app creates English names, while fixtures use Vietnamese names | [constants.ts](../src/lib/constants.ts), [system-categories.ts](../src/lib/server/system-categories.ts), [reset-test-data.sql](../supabase/seed/reset-test-data.sql) |
| Category data | Some joins select only `id/name/icon/color`, without enough information to determine which names need translation | [types.ts](../src/lib/types.ts), [transactions.ts](../src/lib/api/transactions.ts), [queries.ts](../src/lib/server/queries.ts), [rpc-result.ts](../src/lib/server/rpc-result.ts) |
| Errors | APIs return error sentences; Supabase and SQL errors can reach the UI directly | [route.ts](../src/lib/server/route.ts), [client.ts](../src/lib/api/client.ts) |
| Notifications | The server constructs English `title/detail` text; content-independent IDs preserve read/dismiss state | [notifications/route.ts](../src/app/api/notifications/route.ts) |
| AI | Analysis must respond in Vietnamese; the parser assumes a Vietnamese user; the cache has no explicit locale component | [spending-analysis-prompt.ts](../src/lib/server/spending-analysis-prompt.ts), [parse-transaction/route.ts](../src/app/api/ai/parse-transaction/route.ts), [spending-analysis/route.ts](../src/app/api/ai/spending-analysis/route.ts) |
| Reports | CSV exports use English headings and Vietnamese money formatting; CSV and AI comparison logic group/match categories by name | [export-csv/route.ts](../src/app/api/reports/export-csv/route.ts), [period-summary.ts](../src/lib/server/period-summary.ts) |
| Stored content | Money RPCs write English sentences into `transactions.note` when the user leaves the note empty | [money_functions_return_what_changed.sql](../supabase/migrations/20261003000000_money_functions_return_what_changed.sql) |
| Actual schema | The README warns that repository migrations do not fully reflect the running schema | [README.md](../README.md) |

These counts reflect source code; live data and Supabase configuration have not been verified. The README also mentions an iOS client that queries Supabase directly; its source is not present in this repository, so its impact has not been checked.

## 3. Localization Coverage Inventory

For every screen, review titles, labels, buttons, placeholders, help text, empty states, loading states, errors, confirmations, and success messages.

| Area | Content to address |
|---|---|
| Navigation and application shell | Sidebar, header, account menu, More page, mobile navigation, quick-add button, sign-out |
| Authentication | Sign-in, registration, forgot/reset password, email confirmation, callback errors, session expiry, retry limits |
| Dashboard | Greetings, financial summaries, net worth, spending pace, charts, debts, budget alerts, recent transactions |
| Transactions | List/calendar, dedicated mobile creation page and desktop modal, edit/delete/undo, bulk selection, recategorization, filters, search, bank fees, insufficient balance, duplicate warnings, category suggestions, frequent transaction chips |
| CSV import | File/wallet selection, file limits, column/number separators, column mapping, row errors, duplicates, review screen, deselection, confirmation, import summary |
| Wallets | Wallet types, default status, balances, credit limits, statement/due dates, transfers, card payments, reconciliation, detailed history/pagination |
| Categories | 13 default categories, six system categories, income/expense labels, Default badge, selectors/tiles/filters, explanations for deletion restrictions |
| Budgets | Create/edit/pause, historical suggestions, rollover, spent/remaining/over-budget amounts, confirmations, introductory summaries |
| Debts | Lending/borrowing, active/completed/overdue states, collection/repayment/addition actions, due dates, history, details, generated notes |
| Recurring transactions | Frequency, next run date, end date, pause/resume/skip one occurrence, confirmations, warnings |
| Savings goals | Status, progress, deadlines, goal completion, amount updates, summaries |
| Reports | Week/month/quarter/year periods, comparison periods, axis labels/legends/tooltips, cash-flow classification, summaries, CSV downloads |
| AI | Labels/loading/errors/retry, analysis content, prompt/output language, quick-entry examples, locale-specific caching |
| Settings | Profile, avatar, email, password, light/dark/system appearance, account, language selector, language save status |
| Shared components | Modals, confirmations, toasts and Undo, selectors/search, date picker, transaction calendar, period selector, amount input, emoji picker and search keywords |
| Server/DB content | API validation, RPC business errors, system-error fallbacks, summaries built by Server Components, notifications, generated notes |
| Email and authentication links | Subjects, bodies, buttons, expiry/link errors for registration, password recovery, email changes, and enabled security emails; locale preservation through callbacks |
| Pages and accessibility | 404, page errors, `global-error` when the provider is unavailable, browser tab titles, metadata, `html lang`, PWA manifest, `aria-label`, `title`, alt text, screen-reader-only content |

**Phase assignment.** Everything above is Phase 1 except the following, which are Phase 2:
- **Email and authentication links**: the whole row.
- **Server/DB content**: RPC business errors (`P0001`) and generated notes.
- **Reports**: CSV export headings and labels.
- **Pages and accessibility**: the PWA manifest.

Until Phase 2 ships, these keep their current text. That is a documented exception, not a missing translation.

Do not automatically translate user-defined wallet names, custom categories, borrowers' names, goals, or notes. Preserve bank names, brands, and CSV descriptions/references. Translate payment method choices only when they are app-managed codes; preserve free-form values.

## 4. Proposed Design

### 4.1. Locale and Translation Management

- Use one shared i18n layer for Server Components, Client Components, metadata, and route handlers. Use `next-intl` as the proposed solution rather than building custom pluralization and interpolation.
- Documentation reviewed for `next-intl` 4.14.9 supports cookie-based locale resolution in request configuration, a client provider, and server translation APIs without requiring URL changes. No dependency has been installed or version selected.
- Proposed files: `src/i18n/request.ts`, `src/i18n/locale.ts`, `messages/vi.json`, `messages/en.json`. Organize namespaces by domain: `common`, `auth`, `dashboard`, `transactions`, `wallets`, `categories`, `budgets`, `debts`, `recurring`, `savingGoals`, `reports`, `settings`, `notifications`, `errors`.
- Store the account preference in `user_metadata.locale`, consistent with existing profile storage. Use a cookie for signed-out users and initial rendering; localStorage alone is insufficient because the server also needs the locale.
- Signed-in precedence: valid account locale, valid cookie, `Accept-Language`, then `vi`. Signed-out precedence: cookie, `Accept-Language`, then `vi`.
- Accept only `vi`/`en`; map variants such as `vi-VN`/`en-US`. Respect priority and quality values in `Accept-Language`; unsupported locales must fall back rather than load arbitrary files.
- Provide a selector on authentication screens and in Settings. After a successful save, update the cookie and refresh server and client content while preserving the current screen, filters, and drafts. Show a clear error if saving fails.
- When another account signs in on the same browser, prioritize that account's locale. Keep the cookie after sign-out for the sign-in screen; a later signed-out selection must not update the previous account.
- Changing locale must refresh data containing translated sentences, including notifications, CSV exports, and AI results. Do not mix translations across requests or accounts.
- Use semantic keys and translate complete sentences with parameters instead of joining sentence fragments. Support plural forms for `0/1/n` and embedded emphasis within complete messages where needed.
- Runtime fallback: unsupported locales use the default; missing keys use the corresponding `vi` message and emit diagnostics. The repository has no CI, so add `tests/messages.test.mjs` (same `node --test` pattern as the existing tests) that rejects missing keys, mismatched parameters, and invalid ICU syntax between `vi.json` and `en.json`; fallback does not count as completed translation.
- At registration, write the current locale into `user_metadata.locale` (`signUp` `options.data`) so the account starts with the language chosen on the sign-up screen.
- `global-error` needs a minimal translation set independent of the main provider. Do not expose raw technical errors to users.

### 4.2. Default and System Categories

This section localizes the existing category model. The future Store and its adopted-category naming rules belong to the separate plan and are not prerequisites for completing localization.

Do not create a separate category for each language. Preserve existing IDs so transactions, budgets, and history remain linked.

**Shared default categories:** add a stable, nullable `default_key`, assigned only to verified default rows. Do not extend the business `system_key` values because they already determine cash-flow classification in reports.

| Proposed `default_key` | Vietnamese | English |
|---|---|---|
| `salary` | Lương | Salary |
| `bonus` | Thưởng | Bonus |
| `investment` | Đầu tư | Investment |
| `other_income` | Thu nhập khác | Other income |
| `food_drink` | Ăn uống | Food & drink |
| `transport` | Di chuyển | Transport |
| `shopping` | Mua sắm | Shopping |
| `entertainment` | Giải trí | Entertainment |
| `health` | Sức khỏe | Health |
| `housing` | Nhà ở | Housing |
| `education` | Học tập | Education |
| `bills` | Hóa đơn | Bills |
| `other_expense` | Chi tiêu khác | Other expense |

**System categories:** reuse the six existing `system_key` values for label translation without changing their accounting meaning.

| `system_key` | Vietnamese | English |
|---|---|---|
| `lend_out` | Cho vay | Lend |
| `borrow_in` | Đi vay | Borrow |
| `collect_debt` | Thu nợ | Collect debt |
| `repay_debt` | Trả nợ | Repay debt |
| `adjust_up` | Điều chỉnh tăng số dư | Balance increase adjustment |
| `adjust_down` | Điều chỉnh giảm số dư | Balance decrease adjustment |

**Custom categories and renamed categories:** display the original `name`. The API currently allows renaming user-owned categories, including system categories; distinguish generated names from customized names before translating them automatically. Shared default rows (`user_id IS NULL`) cannot be renamed by users (RLS allows updates to own rows only), so the flag matters for system categories, and later for Store-adopted copies.

- Add `name_is_custom boolean not null default false`. New app-created system categories use `false`.
- Rename intent is explicit in the API. Today an icon/color-only edit also sends `name`: `PATCH /api/categories/[id]` requires it and `categoriesApi.update` always sends it. Once the UI shows translated names, the form would send the translated label back, and that would count as a rename. Make `name` optional in the PATCH body; the client sends it only when the user edited the name field. Whenever `name` is present, the API writes `name_is_custom = true` in the same update, even if the value equals the stored `name`. Example: the DB stores `Lend`, the UI shows “Cho vay”, and the user types `Lend`; that is still a deliberate custom name.
- Direct writers are covered by a database trigger as a safety net: a `BEFORE UPDATE` trigger sets `name_is_custom = true` when `NEW.name IS DISTINCT FROM OLD.name`. This covers the iOS client, which writes to Supabase directly and bypasses the API. The trigger cannot see intent when the value does not change; only the API path can.
- Legacy backfill: names only produce candidates; they never prove provenance.
  - Exact match with the English name the app generates for that same `system_key` (`system-categories.ts`): proposed `false`. The row was created with that exact value, so the only possible wrong guess is a user who renamed it away and back to the identical text. Approve this group as a whole during the pre-migration review before writing anything.
  - Match with a Vietnamese label (for example, the `reset-test-data.sql` names) or any other name: `true`, listed for review. A Vietnamese name on a row the app created in English means someone typed it.
  - Match per key only, never against the default-category labels. `adjust_up` and `adjust_down` are both currently created as "Balance Adjustment".
- Before writing this migration, capture the live definitions of `categories.system_key` and the partial unique index on `(user_id, system_key)` in a migration: neither is in `supabase/migrations/` today.
- Assign `default_key` only through a verified list of shared-row IDs. Do not assign keys to custom categories just because they are also named “Ăn uống”. If rows are missing or duplicated, stop that backfill for review; do not automatically merge, delete, or create duplicates.
- Use one shared name resolver: preserve customized names; otherwise translate by `default_key` or `system_key`; retain `name` for categories without a key.
- Include identification fields in the relevant types/joins: `CategoryRef`, `Category`, transaction/wallet history, budgets/rollover/suggestions, recent/frequent transactions, imports, notifications, reporting, and post-mutation results through `rpc-result`.
- Apply the same rule everywhere categories appear: cards, avatar initials, selectors/tiles, search, filters, tables, charts/tooltips, CSV, and AI. Sort by translated names using the active locale while keeping the Default group first.
- Search default categories by their current display name and Vietnamese/English aliases; support accent-insensitive Vietnamese search. Keep IDs as selection values.
- Aggregate and match categories by `category_id`, not translated names. In particular, update `period-summary` (groups by `name`), CSV grouping/budget matching (`export-csv` groups by `name` and matches budgets by `name`), and AI comparison data; categories sharing a name must remain separate entries. This is an existing bug, independent of i18n: ship it first as its own change (step 0 in section 5).

### 4.3. Errors, Notifications, and Generated Content

**Phase 1:**
- Notifications rendered in the request locale.
- Route-handler validation messages translated on the server with the request locale.
- Client-side, network, session, rate-limit, and AI-failure messages.
- CSV import errors. `CsvError` is shared by the browser and the server, and currently carries English sentences:
  - The parser in `src/lib/imports/bank-csv.ts` (about 22 sites) runs in the browser and also on the server.
  - `src/lib/server/bank-import.ts` throws it while reading the request (5 sites).
  - `api/transactions/import` and `api/transactions/import/preview` return `badRequest(error.message)`.
- Change `CsvError` to carry a message key plus parameters (row number, limits). Update every site that creates it.
- The import screen translates client-side errors with the UI locale.
- The two routes translate with the request locale before responding and keep the `{ error: string }` contract. Raw keys or missing parameters must never reach the user.
- Extend `tests/bank-csv.test.mjs` to assert keys and parameters instead of sentences.

**Phase 2:**
- Stable RPC error codes, including server-side import errors raised by the CSV import RPC. Until then, RPC error text is shown as today (documented exception).
- Generated-note metadata.

- APIs return stable business error codes with raw parameters such as amounts, wallet names, and limits. Clients translate using the active locale; preserve HTTP status codes and compatible fallbacks for existing callers during the transition.
- Use structured errors for both the client CSV parser and server validation, including row numbers. Do not translate by matching fragments of English error sentences.
- `P0001` currently covers multiple SQL errors and is insufficient as a business error code. Define detailed codes/parameters in money RPCs and map them through the API layer. Preserve validation, locks, RLS, atomicity, and balance updates.
- Map Auth/Supabase errors by stable codes where available; use safe translated messages for unknown errors and log their causes on the server. Check the password update flow that calls Supabase directly and catch handlers using `error.message`.
- Notifications may continue returning `title/detail` to preserve their contract, rendered on the server using the request locale. Refetch after locale changes. IDs, `read_at`, and `dismissed_at` must remain independent of translations and must not reset.
- New generated notes for transfers, card payments, debt collections/repayments/additions, and reconciliation need a content key and parameters that distinguish them from user-entered notes. Render in the viewing locale instead of storing a new translated sentence on every language change.
- Simpler alternative to evaluate before adding columns: RPCs store `note = null` when the user leaves it empty (`'Transfer to …'`, `'Credit card payment — …'`, and `'Reconciled …'` in `money_functions_return_what_changed.sql`), and the UI derives the label from `transfer_pair_id`, transaction type, and wallet. Choose one approach in Phase 2.
- Do not infer that legacy notes were generated merely because they begin with “Repayment” or “Reconciled”. Preserve rows without provenance evidence; translating historical notes requires a separate review before backfilling.
- Recurring transactions preserve user-entered notes. Inspect the actual jobs/cron configuration for generated content outside the available source.

### 4.4. Dates, Numbers, and Money

- Use the UI locale for words: weekday/month names, period ranges, and relative dates.
- Numbers, percentages, positive/negative values, and VND amounts keep `vi-VN` formatting in both languages (decided). The currency is always VND, and one separator convention means amount inputs never have to parse both `1.000` and `1,000`.
- Translate the words around numbers: compact suffixes (“triệu/tỷ” vs “million/billion”, or `K/M/B`), “ngày/tháng” (days/months), “Hôm nay/Hôm qua” (Today/Yesterday), and `Q1`/quarter labels. Changing `formatVND` alone is insufficient.
- Amount inputs, the centered transaction form input, min/max filters, and amount suggestions keep their current parsing. Format for display but submit raw numeric values.
- Preserve the technical representation of ISO dates and period/ledger-date helpers. Do not change the locale used by `localYMD` merely because the UI language changes.
- CSV imports use the user-selected number/date mapping, not the UI language, to interpret statement formats. Preserve references and duplicate-prevention identities.

### 4.5. AI, CSV, Email, and PWA

- AI analysis receives a validated locale; replace all instructions and output examples currently fixed to Vietnamese. Preserve the JSON schema, financial rules, and requirements against fabricated data.
- Include locale in AI cache keys and client caches; identify periods by type/start date rather than translated labels alone. Preserve `user_id` scoping; language changes must not reuse analysis in the previous language.
- The parser accepts Vietnamese/English text independently of the screen language, retaining support for `k/tr/tỷ`, Vietnamese bank SMS messages, and custom wallet/category names. Do not automatically translate user-entered notes; return stable IDs for confirmation before saving.
- `parse-transaction` currently sends only the stored `name` (Vietnamese for defaults) to the model. Send both Vietnamese and English labels for keyed categories so English input (“lunch 50k”) still maps to `food_drink`.
- CSV exports translate every section/header, wallet/transaction/reporting-group label, category, fallback, and export timestamp. Preserve the column/section structure and raw dates according to the contract; never group by translated names.
- CSV money remains VND and follows the documented export conventions; verify Unicode, comma/period handling, quoting, and opening in Excel. Do not silently change machine-readable conventions when locale changes. Technical filenames may remain stable.
- Inspect the email templates, provider, and delivery mechanism configured in Supabase. Source code only shows calls to the Auth API; this does not establish whether emails are localized or templates can be selected per locale.
- Locale must be available during registration/password recovery, before sign-in. Email changes, recovery, and callbacks must preserve the language choice; do not put tokens or sensitive data in locale parameters.
- Supabase Auth email templates support Go template conditionals on user metadata (`{{ if eq .Data.locale "en" }}…{{ else }}…{{ end }}`), so one template per email type can carry both languages without a provider change. Limitation: the email follows the locale saved on the account, not the language currently selected on a signed-out screen (for example, forgot password). Verify against the project's actual template settings.
- If the current email configuration cannot select localized content per send, track that as a separate implementation item and choose a delivery approach after verification. A provider change is not required by this proposal.
- Translate titles/descriptions per request. The PWA manifest needs the appropriate locale and caching; the “Finance” brand name may remain unchanged. Check limitations on updating installed app names/descriptions because the OS controls launcher behavior.

## 5. Implementation Order and Verification

Each step is its own reviewable change. Phase 1 is complete when steps 0–6 pass the Phase 1 checklist (section 6.1). Phase 2 is steps 7–9. The Category Store starts only after both phases are complete.

| Step | Phase | Required outcome | Required verification |
|---|---|---|---|
| 0. Group by ID (existing bug) | 1 | `period-summary`, CSV export grouping, and CSV budget matching use `category_id` instead of `name` | Two categories with the same name stay separate in reports, CSV, and AI comparison; totals unchanged otherwise |
| 1. Confirm conventions | 1 | Keep the confirmed `vi/en` scope; settle fallback, terminology, category renaming rules, and ambiguous historical data handling; inspect schema/email/cron/other clients | Data inventory and list of unverified items; no data changes yet |
| 2. i18n foundation | 1 | Locale resolver, cookie + metadata, dictionaries/provider, Auth/Settings selectors, shared formatters, `tests/messages.test.mjs` | Valid/unsupported locales, `Accept-Language` quality values, account switching, reloads, matching SSR/client language, save failures |
| 3. Categories | 1 | Stable keys, `name_is_custom` (API + trigger), resolver, joins/types | 13 defaults + six system categories; custom names matching defaults; explicit same-value rename stays custom; preserved IDs/FKs; migration rehearsed in a test database |
| 4. UI coverage | 1 | Translate the Phase 1 areas of section 3, including secondary states and accessibility content | Vietnamese/English desktop/mobile smoke tests, modal/dedicated page, long text, toast/Undo, date picker, chart tooltips, 404/500 |
| 5. Notifications and errors | 1 | Notifications rendered in the request locale; route-handler validation messages translated; `CsvError` carries key + parameters; import/preview routes translate it with the request locale | Notification read/dismiss state preserved across locale changes; invalid input, 401/429 in both languages; CSV size/row-count/separator/quote/row errors in both languages with correct row numbers, checked through the browser parser, the preview API, and the import API |
| 6. AI | 1 | Localized analysis prompt/output, locale in AI cache keys, bilingual category labels for the parser | Separate Vietnamese/English caches; parser handles Vietnamese and English input; notes preserved |
| 7. RPC errors and generated content | 2 | Error codes + parameters for money RPCs; chosen approach for generated notes | Insufficient balance, excessive debt payment, other RPC errors; unchanged balances/permissions/atomicity; custom notes preserved |
| 8. CSV export, email, PWA | 2 | Complete CSV export coverage, localized Auth emails, metadata/PWA | Usable CSV files; actual test email delivery and callbacks; PWA checks on supported devices |
| 9. Final review and handoff | 2 | Key coverage, remaining hardcoded strings reviewed, glossary, translation contribution guide | Dictionary/ICU/parameter validation, behavioral regression checks, lint, typecheck, build, relevant tests; no remaining documented exceptions |

Resolve schema drift before writing/running i18n migrations. New migrations must add fields and preserve existing contracts during the transition; do not rewrite historical migrations or delete/recreate categories. Stop rollout when backfill decisions are ambiguous. Application rollback must still read existing `name`/`note` values without deleting newly added data.

## 6. Completeness and Acceptance Checklist

### 6.1. Phase 1

- [ ] Both `vi` and `en` cover every Phase 1 area in section 3; Phase 2 areas and other unchanged strings are listed as documented exceptions.
- [ ] Language switching before/after sign-in, reloads, and subsequent sign-ins behave correctly without losing drafts or filters.
- [ ] SSR, client content, metadata, `html lang`, page errors, notifications, and route-handler messages use a consistent locale without translation leakage through shared caches.
- [ ] All default categories have translation keys; system categories distinguish generated/custom names; ambiguous legacy data is listed rather than overwritten.
- [ ] Editing only a category's icon/color keeps `name_is_custom = false`; any API rename sets it to `true`, even to the same stored value; a direct Supabase rename sets it through the trigger.
- [ ] Categories use consistent display names in quick add, wallet history, imports, budgets, notifications, charts, AI, and post-save results.
- [ ] Language changes do not alter IDs, raw notes, amounts, balances, reporting periods, ledger dates, recurring schedules, permissions, or read/dismiss state.
- [ ] Categories with different IDs but identical names are not merged; AI comparison and budget matching do not depend on translated names.
- [ ] Verify month/year boundaries, overdue states, zero/large/negative amounts, plus/minus signs, percentages, plural forms 0/1/n, and long translations on mobile. Amounts render as `vi-VN` in both languages.
- [ ] Client validation, CSV errors (browser, preview API, and import API, with row numbers intact), route-handler errors, Auth errors, session expiry, rate limits, network failures, and AI failures have translated messages.
- [ ] AI language changes do not reuse the previous locale's cache; output is no longer fixed to Vietnamese; the parser preserves user text.
- [ ] CSV imports preserve number/date meaning and duplicate identities.
- [ ] Tooltips, placeholders, aria-labels, screen-reader text, emoji search, and 404/global errors have been checked.
- [ ] `tests/messages.test.mjs` passes; tests/fixtures are updated within scope; hardcoded-string regex scans are not treated as the sole evidence of completeness.

### 6.2. Phase 2

- [ ] Every Phase 1 documented exception is resolved or explicitly kept with a reason.
- [ ] Money RPC and CSV import RPC errors reach the UI as translated messages with parameters; balances, permissions, and atomicity are unchanged.
- [ ] Generated notes render in the viewing locale; user-entered and legacy notes are preserved.
- [ ] CSV exports are fully translated; Vietnamese Unicode, quoting, and Excel opening work correctly.
- [ ] Registration, password reset, and email change messages have been tested through actual email delivery in each language; expired/error links and callbacks use the correct locale.
- [ ] Metadata and PWA behavior have been checked on supported devices.
- [ ] Verify the iOS client and content sources outside this repository, if still used, before declaring the entire system complete.

## 7. Review Limitations

Source code, migrations, fixtures, and repository documentation were reviewed; only this proposal document was added. The app and browser flows have not been tested; live DB data, Supabase email templates/cron configuration, email delivery, and AI calls have not been checked. No implementation, migration execution, commit, or push has been performed.

Library design references: [next-intl App Router](https://github.com/amannn/next-intl/blob/v4.14.9/docs/src/pages/docs/getting-started/app-router.mdx), [request configuration](https://github.com/amannn/next-intl/blob/v4.14.9/docs/src/pages/docs/usage/configuration.mdx). Documentation was reviewed through Context7; compatibility and the installed version will be confirmed during implementation.
