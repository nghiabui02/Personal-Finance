'use client'

import { useRouter } from 'next/navigation'
import { TransactionForm } from '../../_components/transaction-form'
import type { QuickAddData } from '@/lib/server/quick-add-data'

/**
 * The create form on its own page. Leaving — saved or cancelled — goes back to
 * wherever the user came from, so logging a spend never loses their place.
 */
export function NewTransactionClient({ data, defaultDate }: { data: QuickAddData; defaultDate?: string }) {
  const router = useRouter()

  function leave() {
    router.back()
  }

  return (
    <TransactionForm
      editing={null}
      categories={data.categories}
      wallets={data.wallets}
      debts={data.debts}
      frequent={data.frequent}
      defaultDate={defaultDate}
      onDone={leave}
      onCancel={leave}
    />
  )
}
