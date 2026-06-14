import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ReportsClient, { type PeriodType } from './_components/reports-client'
import type { ChartPoint, CategoryData } from './_components/types'

export const metadata: Metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMondayOfWeek(d: Date): string {
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toYMD(monday)
}

function getDefaultStart(period: PeriodType): string {
  const now = new Date()
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: txs }, { data: expenseRows }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
    supabase
      .from('transactions')
      .select('amount, categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
  ])

  const transactions = (txs ?? []) as RawTx[]
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const catMap = new Map<string, CategoryData>()
  for (const row of expenseRows ?? []) {
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + Number(row.amount) })
  }

  return (
    <ReportsClient
      period={period}
      start={start}
      chartData={buildChartData(transactions, period, startDate)}
      byCategory={[...catMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8)}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
    />
  )
}
