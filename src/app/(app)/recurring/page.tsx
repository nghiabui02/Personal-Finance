import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import RecurringClient from './_components/recurring-client'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'
import { WALLET_COLUMNS } from '@/lib/api/wallets'

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
    supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('wallets')
      .select(WALLET_COLUMNS)
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
  ])

  return (
    <RecurringClient
      items={(items ?? []) as unknown as Parameters<typeof RecurringClient>[0]['items']}
      categories={categories ?? []}
      wallets={(wallets ?? []) as unknown as Parameters<typeof RecurringClient>[0]['wallets']}
    />
  )
}
