import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import CategoriesClient from './_components/categories-client'
import { requireUser } from '@/lib/server/auth'
import { getCategories } from '@/lib/server/queries'
import { localYMD } from '@/lib/utils/date'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('categories') }
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const initialTab = type === 'income' ? 'income' : 'expense'

  const { supabase, user } = await requireUser()

  const month = `${localYMD().slice(0, 7)}-01`
  const [categories, budgets, recurring] = await Promise.all([
    getCategories(supabase),
    supabase.from('budgets').select('id, user_category_id, month').eq('user_id', user.id).eq('active', true).eq('month', month),
    supabase.from('recurring_transactions').select('id, user_category_id, note').eq('user_id', user.id).eq('active', true),
  ])
  if (budgets.error) throw budgets.error
  if (recurring.error) throw recurring.error
  const t = await getTranslations('categories')
  const dependencies = [
    ...budgets.data.map(row => ({ ...row, label: t('currentBudgetDependency', { month: row.month.slice(0, 7) }), href: '/budgets' })),
    ...recurring.data.map(row => ({ ...row, label: row.note || t('recurringDependency'), href: '/recurring' })),
  ]

  return <CategoriesClient categories={categories} initialTab={initialTab} dependencies={dependencies} />
}
