import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import RecurringClient from './_components/recurring-client'

export const metadata: Metadata = { title: 'Recurring' }
export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: items }, { data: categories }, { data: wallets }] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*, categories(id, name, icon, color), wallets(id, name)')
      .eq('user_id', user.id)
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
