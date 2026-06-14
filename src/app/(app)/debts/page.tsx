import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DebtsClient from './_components/debts-client'

export const metadata: Metadata = { title: 'Debts' }
export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: debts }, { data: wallets }] = await Promise.all([
    supabase
      .from('debts')
      .select('*, debt_payments(id, amount, note, paid_at), wallets(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wallets')
      .select('id, name, color, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
  ])

  return (
    <DebtsClient
      debts={(debts ?? []) as unknown as Parameters<typeof DebtsClient>[0]['debts']}
      wallets={(wallets ?? []) as unknown as Parameters<typeof DebtsClient>[0]['wallets']}
    />
  )
}
