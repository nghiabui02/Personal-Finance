'use client'

import { useState } from 'react'
import { type Category } from '@/lib/api/categories'
import { type Wallet } from '@/lib/api/wallets'
import type { DebtOption } from '@/lib/types'
import { TransactionModal } from '../../transactions/_components/transaction-modal'

interface DashboardAddButtonProps {
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
}

export function DashboardAddButton({ categories, wallets, debts }: DashboardAddButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-above-nav right-4 md:bottom-8 md:right-6 z-30 w-14 h-14 rounded-full bg-[#111111] dark:bg-white shadow-xl flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <svg className="text-white dark:text-gray-900" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {open && (
        <TransactionModal
          editing={null}
          categories={categories}
          wallets={wallets}
          debts={debts}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
