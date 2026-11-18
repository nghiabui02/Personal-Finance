import type { SupabaseClient } from '@supabase/supabase-js'
import { localYMD, shiftLocalDate } from '@/lib/utils/date'
import type { CategoryRef } from '@/lib/types'
import type { HistoryTransaction } from '@/lib/transaction-matching'

/**
 * The recent history every "what did I do last time" feature reads: one-tap
 * repeat chips, the category a note was filed under, and the warning that this
 * spend is already recorded.
 *
 * One query serves all three. They were going to read the same rows over the
 * same window anyway, and three copies of it would drift the moment one of
 * them needed another column.
 */

const LOOKBACK_DAYS = 90
const MAX_ROWS = 1000

export interface RecentTransaction extends HistoryTransaction {
  categories: CategoryRef | null
}

export async function getRecentTransactions(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecentTransaction[]> {
  // Transfer legs are wallet-to-wallet moves and debt payments are driven by
  // the debt record: neither is something the user re-logs by hand, so neither
  // belongs in a suggestion or a duplicate warning.
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, note, transaction_date, category_id, wallet_id, categories(id, name, icon, color, default_key, name_is_custom, system_key)')
    .eq('user_id', userId)
    .is('transfer_pair_id', null)
    .is('debt_payment_id', null)
    .gte('transaction_date', shiftLocalDate(localYMD(), -LOOKBACK_DAYS))
    .order('transaction_date', { ascending: false })
    .limit(MAX_ROWS)

  if (error) {
    console.error('[recent-transactions] load failed for user', userId, error.message)
    return []
  }

  return (data ?? []) as unknown as RecentTransaction[]
}
