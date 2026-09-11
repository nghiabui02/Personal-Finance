'use client'

import { useState } from 'react'
import { type Category } from '@/lib/api/categories'
import { type Wallet } from '@/lib/api/wallets'
import type { DebtOption } from '@/lib/types'
import { TransactionModal } from '../transactions/_components/transaction-modal'

/** Everything the transaction modal needs, fetched once in the app layout. */
export interface QuickAddData {
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
}

const PLUS = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"
       stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

/**
 * Logging a transaction, from anywhere. `nav` rides in the centre of the mobile
 * bottom bar; `fab` is the desktop floating button.
 */
export function QuickAddButton({ data, variant }: { data: QuickAddData; variant: 'nav' | 'fab' }) {
  const [open, setOpen] = useState(false)

  const className = variant === 'nav'
    ? '-mt-5 w-14 h-14 rounded-full'
    : 'hidden md:flex fixed bottom-8 right-6 z-30 w-14 h-14 rounded-full'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New transaction"
        className={`${className} bg-brand-fill hover:bg-brand-fill-hover text-white shadow-[0_8px_24px_-6px_rgb(79_70_229/0.5)] flex items-center justify-center ring-4 ring-white dark:ring-gray-900 transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95`}
      >
        {PLUS}
      </button>

      {open && (
        <TransactionModal
          editing={null}
          categories={data.categories}
          wallets={data.wallets}
          debts={data.debts}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
