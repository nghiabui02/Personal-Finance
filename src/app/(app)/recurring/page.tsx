import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import RecurringClient from './_components/recurring-client'
import { categoriesQuery, walletsQuery } from '@/lib/server/queries'

export const metadata: Metadata = { title: 'Recurring' }
export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
  const { supabase, user } = await requireUser()

  const [{ data: items }, { data: categories }, { data: wallets }] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*, categories(id, name, icon, color), wallets(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    categoriesQuery(supabase),
    walletsQuery(supabase, user.id),
  ])

  return (
    <RecurringClient
      items={(items ?? []) as unknown as Parameters<typeof RecurringClient>[0]['items']}
      categories={categories ?? []}
      wallets={(wallets ?? []) as unknown as Parameters<typeof RecurringClient>[0]['wallets']}
    />
  )
}
