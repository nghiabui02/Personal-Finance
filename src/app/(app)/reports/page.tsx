import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_RELATION } from '@/lib/category-columns'
import { getCategoryName } from '@/i18n/category'
import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { getNetWorthSnapshot } from '@/lib/server/net-worth'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { getDateRange, getPeriodSummary } from '@/lib/server/period-summary'
import { getReportTotals, summarizeOperatingTotals, summarizeNonOperatingFlows, getNonOperatingCategoryIds, onlyOperatingTransactions, type ReportTotal } from '@/lib/server/transaction-reporting'
import { getMondayOfLocalWeek, localYMD, shiftLocalDate } from '@/lib/utils/date'
import type { PeriodType } from '@/lib/utils/period'
import type { CategoryRef, NetWorthSnapshot } from '@/lib/types'
import ReportsClient from './_components/reports-client'
import type { ChartPoint } from './_components/types'
import { sumByType } from '@/lib/utils/totals'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('reports') }
}
export const dynamic = 'force-dynamic'

function getDefaultStart(period: PeriodType): string {
  const today = localYMD()
  const [y, m] = today.split('-').map(Number)
  if (period === 'week')    return getMondayOfLocalWeek(today)
  if (period === 'month')   return `${y}-${String(m).padStart(2, '0')}-01`
  if (period === 'quarter') return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
  return `${y}-01-01`
}

// Start of the period immediately before the given one — for AI trend comparison
function getPrevStart(period: PeriodType, start: string): string {
  if (period === 'week') return shiftLocalDate(start, -7)
  const [y, m] = start.split('-').map(Number)
  if (period === 'month') {
    return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`
  }
  if (period === 'quarter') {
    return m <= 3 ? `${y - 1}-${String(m + 9).padStart(2, '0')}-01` : `${y}-${String(m - 3).padStart(2, '0')}-01`
  }
  return `${y - 1}-01-01`
}

async function getTopExpenses(supabase: SupabaseClient, userId: string, start: string, end: string) {
  const excluded = await getNonOperatingCategoryIds(supabase, userId)
  const { data, error } = await onlyOperatingTransactions(supabase.from('transactions')
    .select(`amount, note, transaction_date, ${CATEGORY_RELATION}`)
    .eq('user_id', userId).eq('type', 'expense').gte('transaction_date', start).lt('transaction_date', end), excluded)
    .order('amount', { ascending: false }).order('id').limit(5)
  if (error) throw new Error(`Could not load largest expenses: ${error.message}`)
  return data
}

function buildChartData(txs: ReportTotal[], period: PeriodType, startDate: string, locale: string): ChartPoint[] {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const ymd = shiftLocalDate(startDate, i)
      const [y, m, d] = ymd.split('-').map(Number)
      const label = new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short' })
      const day   = txs.filter(t => t.transaction_date === ymd)
      return { label, income: sumByType(day, 'income'), expense: sumByType(day, 'expense') }
    })
  }

  if (period === 'month') {
    const [y, m] = startDate.split('-').map(Number)
    const days   = new Date(y, m, 0).getDate()
    return Array.from({ length: days }, (_, i) => {
      const d   = i + 1
      const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const day = txs.filter(t => t.transaction_date === ymd)
      return { label: String(d), income: sumByType(day, 'income'), expense: sumByType(day, 'expense') }
    })
  }

  if (period === 'quarter') {
    const [y, m] = startDate.split('-').map(Number)
    const MONTHS = Array.from({ length: 12 }, (_, index) => new Date(y, index, 1).toLocaleDateString(locale, { month: 'short' }))
    return Array.from({ length: 3 }, (_, i) => {
      const mi     = m + i
      const prefix = `${y}-${String(mi).padStart(2, '0')}`
      const month  = txs.filter(t => t.transaction_date.startsWith(prefix))
      return { label: MONTHS[mi - 1], income: sumByType(month, 'income'), expense: sumByType(month, 'expense') }
    })
  }

  // year — 12 months
  const y      = parseInt(startDate)
  const MONTHS = Array.from({ length: 12 }, (_, index) => new Date(y, index, 1).toLocaleDateString(locale, { month: 'short' }))
  return Array.from({ length: 12 }, (_, i) => {
    const prefix = `${y}-${String(i + 1).padStart(2, '0')}`
    const month  = txs.filter(t => t.transaction_date.startsWith(prefix))
    return { label: MONTHS[i], income: sumByType(month, 'income'), expense: sumByType(month, 'expense') }
  })
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string }>
}) {
  const locale = await getLocale()
  const params = await searchParams
  const period = (['week','month','quarter','year'].includes(params.period ?? '')
    ? params.period : 'week') as PeriodType
  const start  = params.start ?? getDefaultStart(period)
  const { startDate, endDate } = getDateRange(period, start)
  const prevStart = getPrevStart(period, start)

  const ninetyDaysAgo = shiftLocalDate(localYMD(), -90)

  const { supabase, user } = await requireUser()

  const [
    totals,
    topExpenses,
    balanceSheet,
    { data: snapshotRows },
    prevSummary,
    budgetRows,
  ] = await Promise.all([
    getReportTotals(supabase, startDate, endDate, period === 'quarter' || period === 'year'),
    getTopExpenses(supabase, user.id, startDate, endDate),
    getNetWorthSnapshot(supabase, user.id),
    supabase
      .from('net_worth_snapshots')
      .select('recorded_date, net_worth')
      .eq('user_id', user.id)
      .gte('recorded_date', ninetyDaysAgo)
      .order('recorded_date', { ascending: true }),
    // Previous period — lets the AI compare trends with real data
    getPeriodSummary(supabase, period, prevStart),
    // Budgets only make sense for the month view (they are monthly)
    period === 'month'
      ? getBudgetsForMonth(supabase, user.id, start.slice(0, 7))
      : Promise.resolve([]),
  ])

  const { netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed } =
    balanceSheet

  const { rows: reportRows, totalIncome, totalExpense, categories } = summarizeOperatingTotals(totals)
  const nonOperatingFlows = summarizeNonOperatingFlows(totals)

  const topTransactions = topExpenses.map(row => {
    const category = row.categories as unknown as CategoryRef | null
    return { note: row.note, category: category ? getCategoryName(category, locale) : null, amount: Number(row.amount), date: row.transaction_date }
  })

  const aiBudgets = budgetRows.filter(b => b.active).map(b => ({
    name: b.categories ? getCategoryName(b.categories, locale) : (locale === 'en' ? 'Other' : 'Khác'),
    budgeted: b.effectiveAmount,
    spent: b.spent,
  }))

  // Net worth change over (roughly) one period length, from the snapshot history
  const periodDays: Record<PeriodType, number> = { week: 7, month: 30, quarter: 91, year: 365 }
  const targetDate = shiftLocalDate(localYMD(), -periodDays[period])
  const baseline = (snapshotRows ?? []).find(s => s.recorded_date >= targetDate)
  const aiNetWorth = {
    current: netWorth,
    changeAmount: baseline ? netWorth - Number(baseline.net_worth) : null,
    changeDays: baseline
      ? Math.round((Date.parse(localYMD()) - Date.parse(baseline.recorded_date)) / 86400000)
      : null,
  }

  return (
    <ReportsClient
      userId={user.id}
      period={period}
      start={start}
      prevStart={prevStart}
      chartData={buildChartData(reportRows, period, startDate, locale)}
      byCategory={categories.filter(category => category.id).slice(0, 8)}
      nonOperatingFlows={nonOperatingFlows}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      aiPrevious={prevSummary}
      aiTopTransactions={topTransactions}
      aiBudgets={aiBudgets}
      aiNetWorth={aiNetWorth}
      netWorth={netWorth}
      totalWalletBalance={totalWalletBalance}
      totalLent={totalLent}
      totalCreditDebt={totalCreditDebt}
      totalBorrowed={totalBorrowed}
      netWorthSnapshots={(snapshotRows ?? []) as NetWorthSnapshot[]}
    />
  )
}
