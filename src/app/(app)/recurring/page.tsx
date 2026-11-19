import { CATEGORY_RELATION } from '@/lib/category-columns'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import RecurringClient from './_components/recurring-client'
import { getCategories, walletsQuery } from '@/lib/server/queries'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('recurring') }
}
export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
  const { supabase, user } = await requireUser()

  const [{ data: items }, categories, { data: wallets }] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select(`*, ${CATEGORY_RELATION}, wallets(id, name)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getCategories(supabase),
    walletsQuery(supabase, user.id),
  ])

  return (
    <RecurringClient
      items={(items ?? []) as unknown as Parameters<typeof RecurringClient>[0]['items']}
      categories={categories}
      wallets={(wallets ?? []) as unknown as Parameters<typeof RecurringClient>[0]['wallets']}
    />
  )
}
