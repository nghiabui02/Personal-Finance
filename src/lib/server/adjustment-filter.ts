import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reconciliation adjustments are bookkeeping, not spending.
 *
 * Reconciling a wallet files a transaction for the gap against the real bank
 * balance. It moves the recorded balance but no money changed hands, so counting
 * it as income or expense makes a month look busier than it was: finding 2M
 * missing would read as "you're spending 30% faster than usual".
 *
 * Debt keys stay in the totals — repaying a loan really does take money out of
 * a wallet. Only the two adjustment keys are excluded.
 */

const ADJUSTMENT_KEYS = ['adjust_up', 'adjust_down']

/**
 * Ids of the user's adjustment categories, or an empty array if they have never
 * reconciled a wallet.
 */
export async function getAdjustmentCategoryIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .in('system_key', ADJUSTMENT_KEYS)

  return (data ?? []).map(c => c.id)
}

/** PostgREST builder, narrow enough to keep this file free of client types. */
interface ExcludableQuery<T> {
  not(column: string, operator: string, value: string): T
}

/**
 * Drops adjustment rows from a transaction query. A no-op when the user has
 * none, so callers don't need to branch.
 */
export function excludeAdjustments<T extends ExcludableQuery<T>>(query: T, ids: string[]): T {
  if (ids.length === 0) return query
  return query.not('category_id', 'in', `(${ids.join(',')})`)
}
