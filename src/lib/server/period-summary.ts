import type { SupabaseClient } from '@supabase/supabase-js'
import { monthRange, shiftLocalDate } from '@/lib/utils/date'
import type { PeriodType } from '@/lib/utils/period'

export function getDateRange(period: PeriodType, start: string): { startDate: string; endDate: string } {
  if (period === 'week') {
    return { startDate: start, endDate: shiftLocalDate(start, 7) }
  }
  if (period === 'month') {
    return monthRange(start.slice(0, 7))
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    const endM = m + 3
    const endY = endM > 12 ? y + 1 : y
    return { startDate: start, endDate: `${endY}-${String(endM > 12 ? endM - 12 : endM).padStart(2, '0')}-01` }
  }
  const y = parseInt(start)
  return { startDate: `${y}-01-01`, endDate: `${y + 1}-01-01` }
}

export type PeriodSummary = {
  totalIncome: number
  totalExpense: number
  categories: { name: string; amount: number }[]
}

// Income/expense/category totals for one period — used both for the default
// "previous period" comparison and for an arbitrary user-picked period.
export async function getPeriodSummary(
  supabase: SupabaseClient,
  userId: string,
  period: PeriodType,
  start: string,
): Promise<PeriodSummary> {
  const { startDate, endDate } = getDateRange(period, start)

  // Transfer legs are excluded: moving money between your own wallets creates
  // a paired income+expense row, which would inflate both totals equally and
  // distort the savings rate. Debt-linked rows stay — those are real cash flow.
  const { data: rows } = await supabase
    .from('transactions')
    .select('type, amount, categories(name)')
    .eq('user_id', userId)
    .is('transfer_pair_id', null)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)

  let totalIncome = 0
  let totalExpense = 0
  const catMap = new Map<string, number>()

  for (const row of rows ?? []) {
    const amt = Number(row.amount)
    if (row.type === 'income') { totalIncome += amt; continue }
    totalExpense += amt
    const name = (row.categories as unknown as { name: string } | null)?.name
    if (name) catMap.set(name, (catMap.get(name) ?? 0) + amt)
  }

  return {
    totalIncome,
    totalExpense,
    categories: [...catMap.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
  }
}
