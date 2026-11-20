import { getLocale } from 'next-intl/server'
import { getCategoryName } from '@/i18n/category'
import type { SupabaseClient } from '@supabase/supabase-js'
import { monthRange, shiftLocalDate } from '@/lib/utils/date'
import type { PeriodType } from '@/lib/utils/period'
import { getReportTotals, summarizeOperatingTotals } from './transaction-reporting'

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
  categories: { id: string; name: string; amount: number }[]
}

// Income/expense/category totals for one period — used both for the default
// "previous period" comparison and for an arbitrary user-picked period.
export async function getPeriodSummary(
  supabase: SupabaseClient,
  period: PeriodType,
  start: string,
): Promise<PeriodSummary> {
  const locale = await getLocale()
  const { startDate, endDate } = getDateRange(period, start)

  // Earned income and spending exclude transfers, loan principal and corrections.
  const totals = await getReportTotals(supabase, startDate, endDate, true)
  const { totalIncome, totalExpense, categories } = summarizeOperatingTotals(totals)

  return {
    totalIncome,
    totalExpense,
    categories: categories.slice(0, 8).map(category => ({ ...category, name: getCategoryName(category, locale) })),
  }
}
