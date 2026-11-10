import type { TransactionType } from '@/lib/constants'
import type { RecentTransaction } from './recent-transactions'

/**
 * The handful of transactions a person actually repeats — the daily coffee, the
 * weekly grocery run — so logging one costs a tap instead of five.
 *
 * "Repeated" means the same type, category, wallet AND exact amount. Rounding
 * amounts into buckets would merge a 35k coffee with a 45k one and fill the
 * chip with a number that was never spent; an exact repeat is the only kind
 * worth offering as one-tap.
 */

const MIN_OCCURRENCES = 2
const MAX_SUGGESTIONS = 5

export interface FrequentTransaction {
  /** Stable identity for React keys and for remounting the amount field. */
  key: string
  type: TransactionType
  amount: number
  categoryId: string | null
  categoryName: string
  categoryIcon: string | null
  walletId: string | null
  note: string | null
  count: number
}

/** Pure: the rows come from `getRecentTransactions`, which every caller
 *  already loads for the category and duplicate checks. */
export function toFrequentTransactions(rows: RecentTransaction[]): FrequentTransaction[] {
  const buckets = new Map<string, FrequentTransaction>()

  for (const raw of rows) {
    if (!raw.category_id) continue // an uncategorised repeat teaches nothing
    const amount = Number(raw.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const key = [raw.type, raw.category_id, raw.wallet_id ?? '', amount].join('|')
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      continue
    }

    buckets.set(key, {
      key,
      type: raw.type === 'income' ? 'income' : 'expense',
      amount,
      categoryId: raw.category_id,
      categoryName: raw.categories?.name ?? 'Uncategorized',
      categoryIcon: raw.categories?.icon ?? null,
      walletId: raw.wallet_id,
      note: raw.note,
      count: 1,
    })
  }

  return [...buckets.values()]
    .filter(b => b.count >= MIN_OCCURRENCES)
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, MAX_SUGGESTIONS)
}
