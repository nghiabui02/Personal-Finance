import type { SupabaseClient } from '@supabase/supabase-js'
import { localYMD, monthRange } from '@/lib/utils/date'

/**
 * Is this month tracking above or below how the last few months actually went?
 *
 * The dashboard's opening sentence needs a comparison, not just a total — a
 * number alone can't tell the user whether to change anything. Comparing a
 * part-finished month against whole past months would always read "under
 * budget", so the average is prorated to the day the month has reached.
 */

const LOOKBACK_MONTHS = 3

export interface SpendingPace {
  /** Expense so far in the month being viewed. */
  actual: number
  /** What the trailing average implies by this point in the month. */
  expected: number
  /** actual/expected − 1. Null when there is no history to compare against. */
  deltaPct: number | null
  daysElapsed: number
  daysInMonth: number
  daysLeft: number
  /** Trailing monthly average expense, over whole months only. */
  monthlyAverage: number
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getSpendingPace(
  supabase: SupabaseClient,
  userId: string,
  month: string,
  actualExpense: number,
): Promise<SpendingPace> {
  const { startDate, endDate } = monthRange(month)
  const daysInMonth = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
  )

  const today = localYMD()
  const isPast = today >= endDate
  const isFuture = today < startDate
  const daysElapsed = isPast ? daysInMonth
    : isFuture ? 0
    : Number(today.slice(8, 10))
  const daysLeft = daysInMonth - daysElapsed

  const lookbackStart = monthRange(shiftMonth(month, -LOOKBACK_MONTHS)).startDate

  // Transfer legs move money between the user's own wallets — not spending.
  const { data } = await supabase
    .from('transactions')
    .select('amount, transaction_date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .is('transfer_pair_id', null)
    .gte('transaction_date', lookbackStart)
    .lt('transaction_date', startDate)

  const byMonth = new Map<string, number>()
  for (const row of data ?? []) {
    const key = String(row.transaction_date).slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(row.amount))
  }

  const monthlyAverage = byMonth.size > 0
    ? [...byMonth.values()].reduce((s, v) => s + v, 0) / byMonth.size
    : 0

  const expected = daysInMonth > 0 ? monthlyAverage * (daysElapsed / daysInMonth) : 0
  const deltaPct = expected > 0 ? actualExpense / expected - 1 : null

  return { actual: actualExpense, expected, deltaPct, daysElapsed, daysInMonth, daysLeft, monthlyAverage }
}
