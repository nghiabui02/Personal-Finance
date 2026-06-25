import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WalletDetailClient from './_components/wallet-detail-client'

export const dynamic = 'force-dynamic'

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('transactions')
      .select('id, type, amount, note, transaction_date, category_id, transfer_pair_id, categories(id, name, icon, color)')
      .eq('wallet_id', id)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (!wallet) notFound()

  return <WalletDetailClient wallet={wallet} transactions={(transactions ?? []) as unknown as Parameters<typeof WalletDetailClient>[0]['transactions']} />
}
