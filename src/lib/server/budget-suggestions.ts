import type { SupabaseClient } from '@supabase/supabase-js'
import { monthRange } from '@/lib/utils/date'
import type { CategoryRef } from '@/lib/types'

/**
 * Starting numbers for budgets, taken from what the user already spends.
 *
 * Budgets stay empty not because the feature is missing but because deciding
 * the number is work. These propose one per category so the first budget is a
 * confirmation instead of a guess.
 */

const LOOKBACK_MONTHS = 3
const MAX_SUGGESTIONS = 5
/** Round to something a person would actually write down. */
const ROUNDING = 50_000

export interface BudgetSuggestion {
  categoryId: string
  category: CategoryRef
  /** Median of the category's monthly totals, rounded. */
  amount: number
  /** How many of the looked-back months had spending here. */
  monthsObserved: number
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Median, not mean: one holiday or one broken laptop would drag an average up
 * and set a ceiling nobody should aim for.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export async function getBudgetSuggestions(
  supabase: SupabaseClient,
  userId: string,
  month: string,
): Promise<BudgetSuggestion[]> {
  const lookbackStart = monthRange(shiftMonth(month, -LOOKBACK_MONTHS)).startDate
  const { startDate } = monthRange(month)

  const [{ data: rows }, { data: existing }] = await Promise.all([
    // Transfers move money between the user's own wallets and system categories
    // (debt, reconciliation) are not discretionary — neither belongs in a budget.
    supabase
      .from('transactions')
      .select('amount, transaction_date, category_id, categories(id, name, icon, color, system_key)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .is('transfer_pair_id', null)
      .gte('transaction_date', lookbackStart)
      .lt('transaction_date', startDate),
    supabase
      .from('budgets')
      .select('category_id')
      .eq('user_id', userId)
      .eq('month', startDate),
  ])

  const alreadyBudgeted = new Set((existing ?? []).map(b => b.category_id).filter(Boolean))

  // category → month → total
  const totals = new Map<string, { category: CategoryRef; byMonth: Map<string, number> }>()

  for (const row of (rows ?? []) as unknown as {
    amount: number | string
    transaction_date: string
    category_id: string | null
    categories: (CategoryRef & { system_key: string | null }) | null
  }[]) {
    const cat = row.categories
    if (!row.category_id || !cat || cat.system_key) continue
    if (alreadyBudgeted.has(row.category_id)) continue

    const entry = totals.get(row.category_id) ?? { category: cat, byMonth: new Map() }
    const key = row.transaction_date.slice(0, 7)
    entry.byMonth.set(key, (entry.byMonth.get(key) ?? 0) + Number(row.amount))
    totals.set(row.category_id, entry)
  }

  return [...totals.entries()]
    .map(([categoryId, { category, byMonth }]) => ({
      categoryId,
      category,
      amount: Math.max(ROUNDING, Math.round(median([...byMonth.values()]) / ROUNDING) * ROUNDING),
      monthsObserved: byMonth.size,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_SUGGESTIONS)
}
