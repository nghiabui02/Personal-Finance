/**
 * The values the database constrains, in one place.
 *
 * Every one of these is also a CHECK constraint or an enum-like text column in
 * Postgres. Written out as literal strings in a dozen files, a renamed status
 * only fails at runtime and only on the path nobody clicked; derived from these
 * arrays, it fails at compile time everywhere at once.
 *
 * Each array is `as const` so the matching type comes from it rather than being
 * typed out a second time alongside.
 */

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** Credit cards are last: everything before them holds money, a card holds the
 *  credit still available. Several balance rules turn on that distinction. */
export const WALLET_TYPES = ['cash', 'bank', 'e_wallet', 'investment', 'other', 'credit'] as const
export type WalletType = (typeof WALLET_TYPES)[number]

/** `lend` is money you are owed, `borrow` is money you owe. */
export const DEBT_TYPES = ['lend', 'borrow'] as const
export type DebtType = (typeof DEBT_TYPES)[number]

export const DEBT_STATUSES = ['active', 'completed', 'overdue'] as const
export type DebtStatus = (typeof DEBT_STATUSES)[number]

/** A payment pays a debt down; an addition lends or borrows more against it. */
export const DEBT_PAYMENT_TYPES = ['payment', 'addition'] as const
export type DebtPaymentType = (typeof DEBT_PAYMENT_TYPES)[number]

export const SAVING_GOAL_STATUSES = ['active', 'completed', 'cancelled'] as const
export type SavingGoalStatus = (typeof SAVING_GOAL_STATUSES)[number]

export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

/**
 * Categories the app creates on the user's behalf. Reports classify a
 * transaction by this key rather than by the category's name, so the name stays
 * free to be renamed or translated.
 *
 * The display side (name, icon, colour) lives in
 * `src/lib/server/system-categories.ts`; the key list is here because the
 * client types need it too and must not pull in the server module.
 */
export const SYSTEM_CATEGORY_KEYS = [
  'lend_out', 'borrow_in', 'collect_debt', 'repay_debt',
  'adjust_up', 'adjust_down',
] as const
export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number]

/**
 * The most transactions one bulk action takes. A selection comes from a list
 * the user scrolled; past this it is a mistake, and the delete loop holds its
 * locks for the whole batch. Shared so the list can say so before the request.
 */
export const MAX_BULK_TRANSACTIONS = 200
