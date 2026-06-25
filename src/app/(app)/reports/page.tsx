import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ReportsClient, { type PeriodType } from './_components/reports-client'
import type { ChartPoint, CategoryData } from './_components/types'

type NetWorthSnapshot = { recorded_date: string; net_worth: number }

export const metadata: Metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Use app timezone so server-side defaults match user's local date
const TZ = process.env.NEXT_PUBLIC_TIMEZONE ?? 'Asia/Ho_Chi_Minh'
function getLocalNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

function getMondayOfWeek(d: Date): string {
  const day = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toYMD(monday)
}

function getDefaultStart(period: PeriodType): string {
  const now = getLocalNow()
  if (period === 'week')    return getMondayOfWeek(now)
  if (period === 'month')   return toYMD(new Date(now.getFullYear(), now.getMonth(), 1))
  if (period === 'quarter') return toYMD(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1))
  return `${now.getFullYear()}-01-01`
}

function getDateRange(period: PeriodType, start: string): { startDate: string; endDate: string } {
  if (period === 'week') {
    const end = new Date(start + 'T00:00:00')
    end.setDate(end.getDate() + 7)
    return { startDate: start, endDate: toYMD(end) }
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    return { startDate: start, endDate: toYMD(new Date(y, m, 1)) }
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    return { startDate: start, endDate: toYMD(new Date(y, m - 1 + 3, 1)) }
  }
  const y = parseInt(start)
  return { startDate: `${y}-01-01`, endDate: `${y + 1}-01-01` }
}

type RawTx = { type: 'income' | 'expense'; amount: number; transaction_date: string }

function buildChartData(txs: RawTx[], period: PeriodType, startDate: string): ChartPoint[] {
  const sum = (list: RawTx[], type: 'income' | 'expense') =>
    list.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0)

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const ymd   = toYMD(d)
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
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

  const now = new Date()
  const todayStr = toYMD(getLocalNow())
  const ninetyDaysAgo = toYMD(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: rows },
    { data: walletRows },
    { data: debtRows },
    { data: snapshotRows },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, transaction_date, categories(id, name, icon, color)')
      .eq('user_id', user.id)
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
  ])

  // Net worth calculation
  let totalWalletBalance = 0
  let totalCreditDebt = 0
  for (const w of walletRows ?? []) {
    if (w.type === 'credit') totalCreditDebt += Math.max(0, Number(w.credit_limit ?? 0) - Number(w.balance))
    else totalWalletBalance += Number(w.balance)
  }
  let totalLent = 0
  let totalBorrowed = 0
  for (const d of debtRows ?? []) {
    if (d.status !== 'active' || Number(d.remaining_amount) <= 0) continue
    if (d.type === 'lend') totalLent += Number(d.remaining_amount)
    else totalBorrowed += Number(d.remaining_amount)
  }
  const netWorth = totalWalletBalance + totalLent - totalCreditDebt - totalBorrowed

  // Upsert today's snapshot so chart stays current
  supabase.from('net_worth_snapshots').upsert(
    { user_id: user.id, net_worth: netWorth, recorded_date: todayStr },
    { onConflict: 'user_id,recorded_date' }
  ).then(() => {})

  const transactions = (rows ?? []) as RawTx[]
  let totalIncome = 0
  let totalExpense = 0
  const catMap = new Map<string, CategoryData>()

  for (const row of rows ?? []) {
    const amt = Number(row.amount)
    if (row.type === 'income') { totalIncome += amt; continue }
    totalExpense += amt
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + amt })
  }

  return (
    <ReportsClient
      period={period}
      start={start}
      chartData={buildChartData(transactions, period, startDate)}
      byCategory={[...catMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8)}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      netWorth={netWorth}
      totalWalletBalance={totalWalletBalance}
      totalLent={totalLent}
      totalCreditDebt={totalCreditDebt}
      totalBorrowed={totalBorrowed}
      netWorthSnapshots={(snapshotRows ?? []) as NetWorthSnapshot[]}
    />
  )
}
