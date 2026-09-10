import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { computeNetWorth, recordNetWorthSnapshot } from '@/lib/server/net-worth'
import { getDateRange, getPeriodSummary } from '@/lib/server/period-summary'
import { getMondayOfLocalWeek, localYMD, shiftLocalDate } from '@/lib/utils/date'
import type { PeriodType } from '@/lib/utils/period'
import type { CategoryRef, NetWorthSnapshot } from '@/lib/types'
import ReportsClient from './_components/reports-client'
import type { ChartPoint, CategoryData } from './_components/types'

export const metadata: Metadata = { title: 'Reports' }
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

type RawTx = { type: 'income' | 'expense'; amount: number; transaction_date: string; note?: string | null }

function buildChartData(txs: RawTx[], period: PeriodType, startDate: string): ChartPoint[] {
  const sum = (list: RawTx[], type: 'income' | 'expense') =>
    list.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0)

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const ymd = shiftLocalDate(startDate, i)
      const [y, m, d] = ymd.split('-').map(Number)
      const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
      const day   = txs.filter(t => t.transaction_date === ymd)
      return { label, income: sum(day, 'income'), expense: sum(day, 'expense') }
    })
  }

  if (period === 'month') {
    const [y, m] = startDate.split('-').map(Number)
    const days   = new Date(y, m, 0).getDate()
    return Array.from({ length: days }, (_, i) => {
      const d   = i + 1
      const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const day = txs.filter(t => t.transaction_date === ymd)
      return { label: String(d), income: sum(day, 'income'), expense: sum(day, 'expense') }
    })
  }

  if (period === 'quarter') {
    const [y, m] = startDate.split('-').map(Number)
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return Array.from({ length: 3 }, (_, i) => {
      const mi     = m + i
      const prefix = `${y}-${String(mi).padStart(2, '0')}`
      const month  = txs.filter(t => t.transaction_date.startsWith(prefix))
      return { label: MONTHS[mi - 1], income: sum(month, 'income'), expense: sum(month, 'expense') }
    })
  }

  // year — 12 months
  const y      = parseInt(startDate)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return Array.from({ length: 12 }, (_, i) => {
    const prefix = `${y}-${String(i + 1).padStart(2, '0')}`
    const month  = txs.filter(t => t.transaction_date.startsWith(prefix))
    return { label: MONTHS[i], income: sum(month, 'income'), expense: sum(month, 'expense') }
  })
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; start?: string }>
}) {
  const params = await searchParams
  const period = (['week','month','quarter','year'].includes(params.period ?? '')
    ? params.period : 'week') as PeriodType
  const start  = params.start ?? getDefaultStart(period)
  const { startDate, endDate } = getDateRange(period, start)
  const prevStart = getPrevStart(period, start)

  const ninetyDaysAgo = shiftLocalDate(localYMD(), -90)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: rows },
    { data: walletRows },
    { data: debtRows },
    { data: snapshotRows },
    prevSummary,
    { data: budgetRows },
  ] = await Promise.all([
    // Transfer legs excluded — see getPeriodSummary() for the rationale
    supabase
      .from('transactions')
      .select('type, amount, note, transaction_date, categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .is('transfer_pair_id', null)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
    supabase.from('wallets').select('type, balance, credit_limit').eq('user_id', user.id),
    supabase.from('debts').select('type, remaining_amount, status').eq('user_id', user.id),
    supabase
      .from('net_worth_snapshots')
      .select('recorded_date, net_worth')
      .eq('user_id', user.id)
      .gte('recorded_date', ninetyDaysAgo)
      .order('recorded_date', { ascending: true }),
    // Previous period — lets the AI compare trends with real data
    getPeriodSummary(supabase, user.id, period, prevStart),
    // Budgets only make sense for the month view (they are monthly)
    period === 'month'
      ? supabase
          .from('budgets')
          .select('amount, category_id, categories(name)')
          .eq('user_id', user.id)
          .eq('month', `${start.slice(0, 7)}-01`)
      : Promise.resolve({ data: null }),
  ])

  const { netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed } =
    computeNetWorth(walletRows ?? [], debtRows ?? [])
  await recordNetWorthSnapshot(supabase, user.id, netWorth)

  const transactions = (rows ?? []) as RawTx[]
  let totalIncome = 0
  let totalExpense = 0
  const catMap = new Map<string, CategoryData>()

  for (const row of rows ?? []) {
    const amt = Number(row.amount)
    if (row.type === 'income') { totalIncome += amt; continue }
    totalExpense += amt
    const cat = row.categories as unknown as CategoryRef | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + amt })
  }

  const topTransactions = (rows ?? [])
    .filter(r => r.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map(r => ({
      note: (r as unknown as RawTx).note ?? null,
      category: (r.categories as unknown as CategoryRef | null)?.name ?? null,
      amount: Number(r.amount),
      date: r.transaction_date,
    }))

  const aiBudgets = (budgetRows ?? []).map(b => ({
    name: (b.categories as unknown as { name: string } | null)?.name ?? 'Khác',
    budgeted: Number(b.amount),
    spent: b.category_id ? (catMap.get(b.category_id)?.amount ?? 0) : 0,
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
      period={period}
      start={start}
      prevStart={prevStart}
      chartData={buildChartData(transactions, period, startDate)}
      byCategory={[...catMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8)}
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
