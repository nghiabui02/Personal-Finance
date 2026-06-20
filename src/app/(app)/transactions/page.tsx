import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './_components/transactions-client'
import type { ViewMode } from './_components/period-navigator'
import { localYMD, localYM } from '@/lib/utils/date'

export const metadata: Metadata = { title: 'Transactions' }
export const dynamic = 'force-dynamic'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return localYMD(d)
}

function getDateRange(
  view: ViewMode,
  params: { month?: string; week?: string; date?: string },
  now: Date,
): { startDate: string; endDate: string; period: string } {
  if (view === 'week') {
    const period = params.week ?? getMondayOfWeek(now)
    const end = new Date(period + 'T00:00:00')
    end.setDate(end.getDate() + 7)
    return { startDate: period, endDate: localYMD(end), period }
  }

  if (view === 'day') {
    const period = params.date ?? localYMD(now)
    const end = new Date(period + 'T00:00:00')
    end.setDate(end.getDate() + 1)
    return { startDate: period, endDate: localYMD(end), period }
  }

  // month (default)
  const period = params.month ?? localYM(now)
  const [y, m] = period.split('-').map(Number)
  return {
    startDate: `${period}-01`,
    endDate: localYMD(new Date(y, m, 1)),
    period,
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; week?: string; date?: string }>
}) {
  const params = await searchParams
  const view = (['month', 'week', 'day'].includes(params.view ?? '') ? params.view : 'month') as ViewMode
  const now = new Date()

  const { startDate, endDate, period } = getDateRange(view, params, now)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: transactions },
    { data: categories },
    { data: wallets },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(id, name, icon, color), wallets(id, name)')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, user_id, name, icon, color, type, is_default, parent_id')
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('wallets')
      .select('id, name, type, balance, color, icon, is_default, user_id')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['transactions']}
      categories={categories ?? []}
      wallets={(wallets ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['wallets']}
      view={view}
      period={period}
    />
  )
}
