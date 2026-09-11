import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { localYM, monthRange } from '@/lib/utils/date'
import BudgetsClient from './_components/budgets-client'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'

export const metadata: Metadata = { title: 'Budgets' }
export const dynamic = 'force-dynamic'

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? localYM()
  const { startDate, endDate } = monthRange(month)

  const { supabase, user } = await requireUser()

  const [{ data: budgets }, { data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', startDate)
      .order('created_at'),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
    supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('type', 'expense')
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  const spent: Record<string, number> = {}
  for (const tx of expenses ?? []) {
    if (!tx.category_id) continue
    spent[tx.category_id] = (spent[tx.category_id] ?? 0) + Number(tx.amount)
  }

  const budgetsWithSpent = (budgets ?? []).map(b => ({
    ...b,
    spent: spent[b.category_id ?? ''] ?? 0,
  }))

  return (
    <BudgetsClient
      budgets={budgetsWithSpent as unknown as Parameters<typeof BudgetsClient>[0]['budgets']}
      expenseCategories={categories ?? []}
      month={month}
    />
  )
}
