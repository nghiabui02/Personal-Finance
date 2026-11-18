import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { getCategories, walletsQuery } from '@/lib/server/queries'
import { getRecentTransactions } from '@/lib/server/recent-transactions'
import type { Wallet } from '@/lib/api/wallets'
import { BankImportClient } from './_components/bank-import-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('importCsv') }
}
export const dynamic = 'force-dynamic'

export default async function ImportTransactionsPage() {
  const { supabase, user } = await requireUser()
  const [categories, wallets, recent] = await Promise.all([
    getCategories(supabase),
    walletsQuery(supabase, user.id).eq('type', 'bank'),
    getRecentTransactions(supabase, user.id),
  ])
  if (wallets.error) throw wallets.error
  return (
    <BankImportClient
      categories={categories}
      wallets={(wallets.data ?? []) as Wallet[]}
      recent={recent}
    />
  )
}
