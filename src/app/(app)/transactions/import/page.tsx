import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { categoriesQuery, walletsQuery } from '@/lib/server/queries'
import type { Category } from '@/lib/api/categories'
import type { Wallet } from '@/lib/api/wallets'
import { BankImportClient } from './_components/bank-import-client'

export const metadata: Metadata = { title: 'Import bank CSV' }
export const dynamic = 'force-dynamic'

export default async function ImportTransactionsPage() {
  const { supabase, user } = await requireUser()
  const [categories, wallets] = await Promise.all([
    categoriesQuery(supabase), walletsQuery(supabase, user.id).eq('type', 'bank'),
  ])
  if (categories.error || wallets.error) throw categories.error ?? wallets.error
  return <BankImportClient categories={(categories.data ?? []) as Category[]} wallets={(wallets.data ?? []) as Wallet[]} />
}
