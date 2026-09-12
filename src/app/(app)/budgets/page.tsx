import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { localYM } from '@/lib/utils/date'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { getBudgetSuggestions } from '@/lib/server/budget-suggestions'
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

  const { supabase, user } = await requireUser()

  // Rollover is computed at read time, so the screen must go through the same
  // helper the dashboard uses — hand-assembling the rows here left
  // `effectiveAmount` undefined and every progress bar showed NaN.
  const [budgets, suggestions, { data: categories }] = await Promise.all([
    getBudgetsForMonth(supabase, user.id, month),
    getBudgetSuggestions(supabase, user.id, month),
    supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('type', 'expense')
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  return (
    <BudgetsClient
      budgets={budgets}
      suggestions={suggestions}
      expenseCategories={categories ?? []}
      month={month}
    />
  )
}
