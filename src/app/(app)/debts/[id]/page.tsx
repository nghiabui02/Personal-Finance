import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DebtDetailClient from './_components/debt-detail-client'

export const dynamic = 'force-dynamic'

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: debt }, { data: wallets }] = await Promise.all([
    supabase
      .from('debts')
      .select('*, debt_payments(id, amount, note, paid_at, type), wallets(id, name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .order('paid_at', { referencedTable: 'debt_payments', ascending: true })
      .single(),
    supabase
      .from('wallets')
      .select('id, name, color, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
  ])

  if (!debt) notFound()

  return <DebtDetailClient debt={debt} wallets={wallets ?? []} />
}
