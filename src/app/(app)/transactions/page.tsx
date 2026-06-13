import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './_components/transactions-client'

export const metadata: Metadata = { title: 'Transactions' }
export const dynamic = 'force-dynamic'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const now = new Date()
  const month = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(year, monthNum, 1).toISOString().slice(0, 10)

  const supabase = await createClient()

  const [
    { data: transactions },
    { data: categories },
    { data: wallets },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(id, name, icon, color), wallets(id, name)')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, user_id, name, icon, color, type, is_default, parent_id')
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('wallets')
      .select('id, name, type, balance, color, icon, is_default, user_id')
      .order('is_default', { ascending: false })
      .order('name'),
  ])

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['transactions']}
      categories={categories ?? []}
      wallets={(wallets ?? []) as unknown as Parameters<typeof TransactionsClient>[0]['wallets']}
      month={month}
    />
  )
}
