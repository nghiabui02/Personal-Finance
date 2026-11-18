import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { localYM } from '@/lib/utils/date'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { getBudgetSuggestions } from '@/lib/server/budget-suggestions'
import BudgetsClient from './_components/budgets-client'
import { getCategories } from '@/lib/server/queries'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('budgets') }
}
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
  const [budgets, suggestions, categories] = await Promise.all([
    getBudgetsForMonth(supabase, user.id, month),
    getBudgetSuggestions(supabase, user.id, month),
    getCategories(supabase),
  ])

  return (
    <BudgetsClient
      budgets={budgets}
      suggestions={suggestions}
      expenseCategories={categories.filter(category => category.type === 'expense')}
      month={month}
    />
  )
}
