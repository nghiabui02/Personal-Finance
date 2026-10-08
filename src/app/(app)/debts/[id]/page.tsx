import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/server/auth'
import DebtDetailClient from './_components/debt-detail-client'
import { walletsQuery } from '@/lib/server/queries'

export const dynamic = 'force-dynamic'

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser()

  const [{ data: debt }, { data: wallets }] = await Promise.all([
    supabase
      .from('debts')
      .select('*, debt_payments(id, amount, note, paid_at, type), wallets(id, name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .order('paid_at', { referencedTable: 'debt_payments', ascending: true })
      .single(),
    walletsQuery(supabase, user.id),
  ])

  if (!debt) notFound()

  return <DebtDetailClient debt={debt} wallets={wallets ?? []} />
}
