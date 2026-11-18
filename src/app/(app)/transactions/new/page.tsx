import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { getQuickAddData } from '@/lib/server/quick-add-data'
import { NewTransactionClient } from './_components/new-transaction-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('newTransaction') }
}
export const dynamic = 'force-dynamic'

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const t = await getTranslations('transactions')
  const { date } = await searchParams
  const { supabase, user } = await requireUser()
  const data = await getQuickAddData(supabase, user.id)

  return (
    <div className="max-w-md mx-auto pb-4">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
        {t('newTransaction')}</h1>
      <NewTransactionClient data={data} defaultDate={date} />
    </div>
  )
}
