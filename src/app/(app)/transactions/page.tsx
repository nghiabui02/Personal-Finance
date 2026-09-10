import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './_components/transactions-client'
import type { ViewMode } from './_components/period-navigator'
import { localYMD, getMondayOfLocalWeek, shiftLocalDate } from '@/lib/utils/date'

export const metadata: Metadata = { title: 'Transactions' }
export const dynamic = 'force-dynamic'

function getDateRange(
  view: ViewMode,
  params: { month?: string; week?: string; date?: string },
  today: string,
): { startDate: string; endDate: string; period: string } {
  if (view === 'week') {
    const period = params.week ?? getMondayOfLocalWeek(today)
    return { startDate: period, endDate: shiftLocalDate(period, 7), period }
  }

  if (view === 'day') {
    const period = params.date ?? today
    return { startDate: period, endDate: shiftLocalDate(period, 1), period }
  }

  // month (default)
  const period = params.month ?? today.slice(0, 7)
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
  searchParams: Promise<{ view?: string; month?: string; week?: string; date?: string; q?: string }>
}) {
  const params = await searchParams
  const view = (['month', 'week', 'day'].includes(params.view ?? '') ? params.view : 'month') as ViewMode
  const today = localYMD()
  const q = params.q?.trim() ?? ''

  const { startDate, endDate, period } = getDateRange(view, params, today)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: transactions },
    { data: categories },
    { data: wallets },
    { data: debts },
  ] = await Promise.all([
    q
      ? supabase
          .from('transactions')
          .select('*, categories(id, name, icon, color), wallets(id, name)')
          .eq('user_id', user.id)
          .ilike('note', `%${q}%`)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100)
      : supabase
          .from('transactions')
          .select('*, categories(id, name, icon, color), wallets(id, name)')
          .eq('user_id', user.id)
          .gte('transaction_date', startDate)
          .lt('transaction_date', endDate)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, user_id, name, icon, color, type, is_default, parent_id, system_key')
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('wallets')
      .select('id, name, type, balance, color, icon, is_default, user_id')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('debts')
      .select('id, type, person_name, remaining_amount')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('remaining_amount', 0)
      .order('person_name'),
  ])

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['transactions']}
      categories={categories ?? []}
      wallets={(wallets ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['wallets']}
      debts={(debts ?? []) as { id: string; type: 'lend' | 'borrow'; person_name: string; remaining_amount: number }[]}
      view={view}
      period={period}
      searchQuery={q}
    />
  )
}
