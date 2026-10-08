import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import DebtsClient from './_components/debts-client'
import { walletsQuery } from '@/lib/server/queries'

export const metadata: Metadata = { title: 'Debts' }
export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
  const { supabase, user } = await requireUser()

  const [{ data: debts }, { data: wallets }] = await Promise.all([
    supabase
      .from('debts')
      .select('*, debt_payments(id, amount, note, paid_at), wallets(id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    walletsQuery(supabase, user.id),
  ])

  return (
    <DebtsClient
      debts={(debts ?? []) as unknown as Parameters<typeof DebtsClient>[0]['debts']}
      wallets={(wallets ?? []) as unknown as Parameters<typeof DebtsClient>[0]['wallets']}
    />
  )
}
