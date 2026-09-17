import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/server/auth'
import { WALLET_TX_PAGE_SIZE, type WalletTransaction, WALLET_TX_COLUMNS } from '@/lib/api/wallets'
import { CATEGORY_COLUMNS } from '@/lib/api/categories'
import WalletDetailClient from './_components/wallet-detail-client'

export const dynamic = 'force-dynamic'

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser()

  const [{ data: wallet }, { data: transactions }, { data: amountRows }, { data: categories }] = await Promise.all([
    supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    // First page only — the rest is lazy-loaded client-side as the user scrolls
    supabase
      .from('transactions')
      .select(WALLET_TX_COLUMNS)
      .eq('wallet_id', id)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, WALLET_TX_PAGE_SIZE - 1),
    // Totals must cover ALL transactions, not just the loaded page
    supabase
      .from('transactions')
      .select('type, amount')
      .eq('wallet_id', id)
      .eq('user_id', user.id),
    // Reconciling can file the gap under a real category — interest on a
    // savings pocket is income, not a bookkeeping correction.
    supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  if (!wallet) notFound()

  let totalIncome = 0
  let totalExpense = 0
  for (const row of amountRows ?? []) {
    if (row.type === 'income') totalIncome += Number(row.amount)
    else totalExpense += Number(row.amount)
  }

  const rows = (transactions ?? []) as unknown as WalletTransaction[]

  return (
    <WalletDetailClient
      wallet={wallet}
      categories={categories ?? []}
      initialTransactions={rows}
      initialHasMore={rows.length === WALLET_TX_PAGE_SIZE}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
    />
  )
}
