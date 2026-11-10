import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'
import { WALLET_COLUMNS, WALLET_TX_COLUMNS } from '@/lib/api/wallets'

/**
 * The two lists almost every page loads, with their ordering attached.
 *
 * The columns already had constants; the ordering did not, and that is the part
 * that drifted — one page sorted wallets by creation date while five sorted by
 * name, so the same list came out in a different order depending on where you
 * looked at it.
 *
 * Each returns the builder rather than the rows, so a caller can still narrow
 * it (`.eq('type', 'expense')`) before awaiting.
 *
 * Neither takes a column list. PostgREST derives the row type from the literal
 * string, and a `columns` parameter either loses that (plain `string`) or sends
 * the type checker into an unbounded expansion (a generic). Pages that used a
 * narrower list now take the full one: a handful of extra columns costs less
 * than four spellings of the same query.
 */

/** Own categories plus the shared starter ones; row-level security decides
 *  which, so there is no user filter here. Defaults first, then by name. */
export function categoriesQuery(supabase: SupabaseClient) {
  return supabase
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .order('is_default', { ascending: false })
    .order('name')
}

/** The user's wallets, default first then alphabetical — the order the wallet
 *  picker shows everywhere. */
export function walletsQuery(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('wallets')
    .select(WALLET_COLUMNS)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name')
}

/** One wallet's transactions, newest first. The detail screen takes the first
 *  page of this on the server and the history route takes the later ones, so
 *  both must order and filter identically or a row could appear twice or never.
 *  The caller adds `.range(...)`. */
export function walletTransactionsQuery(supabase: SupabaseClient, userId: string, walletId: string) {
  return supabase
    .from('transactions')
    .select(WALLET_TX_COLUMNS)
    .eq('wallet_id', walletId)
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
}
