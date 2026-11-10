import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { getQuickAddData } from '@/lib/server/quick-add-data'
import {
  applyTransactionFilters,
  parseTransactionFilters,
  type TransactionFilterParams,
} from '@/lib/server/transaction-filters'
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
  searchParams: Promise<{ view?: string; month?: string; week?: string; date?: string; q?: string } & TransactionFilterParams>
}) {
  const params = await searchParams
  const filters = parseTransactionFilters(params)
  const view = (['month', 'week', 'day'].includes(params.view ?? '') ? params.view : 'month') as ViewMode
  const today = localYMD()
  const q = params.q?.trim() ?? ''

  const { startDate, endDate, period } = getDateRange(view, params, today)

  const { supabase, user } = await requireUser()

  // The form's own data — categories, wallets, debts, repeats, recent history —
  // is the same bundle the standalone /transactions/new page loads.
  const [{ data: transactions }, quickAdd] = await Promise.all([
    // A note search looks across all time; otherwise the visible period bounds
    // it. Either way the same filters narrow the result.
    applyTransactionFilters(
      q
        ? supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color), wallets(id, name)')
            .eq('user_id', user.id)
            .ilike('note', `%${q}%`)
            .limit(100)
        : supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color), wallets(id, name)')
            .eq('user_id', user.id)
            .gte('transaction_date', startDate)
            .lt('transaction_date', endDate),
      filters,
    )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    getQuickAddData(supabase, user.id),
  ])

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['transactions']}
      categories={quickAdd.categories}
      wallets={quickAdd.wallets}
      debts={quickAdd.debts}
      frequent={quickAdd.frequent}
      recent={quickAdd.recent}
      view={view}
      period={period}
      searchQuery={q}
      filters={filters}
    />
  )
}
