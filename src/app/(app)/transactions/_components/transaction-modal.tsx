'use client'

import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category } from '@/lib/api/categories'
import { type Transaction } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import type { DebtOption } from '@/lib/types'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import { TransactionForm } from './transaction-form'

/**
 * The form in a dialog — the desktop shape, and how editing works everywhere.
 *
 * Creating on a phone goes to /transactions/new instead: the form is tall
 * enough that a dialog there becomes a scroll inside a scroll.
 */
export function TransactionModal({
  editing,
  categories,
  wallets,
  debts,
  frequent,
  defaultDate,
  onClose,
}: {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  frequent?: FrequentTransaction[]
  defaultDate?: string
  onClose: () => void
}) {
  const close = useModalClose()

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} size="md" onClose={onClose}>
      <TransactionForm
        editing={editing}
        categories={categories}
        wallets={wallets}
        debts={debts}
        frequent={frequent}
        defaultDate={defaultDate}
        onDone={onClose}
        onCancel={close}
      />
    </Modal>
  )
}
