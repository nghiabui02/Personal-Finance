import { apiFetch } from './client'
import type { TransactionType } from '@/lib/constants'

export type Transaction = {
  id: string
  user_id: string
  wallet_id: string | null
  category_id: string | null
  type: TransactionType
  amount: number
  note: string | null
  transaction_date: string
  /** Portion of `amount` that is a bank fee — display breakdown only;
   *  `amount` is always the real total charged. */
  bank_fee: number | null
  debt_payment_id: string | null
  transfer_pair_id: string | null
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
  wallets: { id: string; name: string } | null
}

/**
 * A transfer leg and a debt repayment are owned by the record they belong to:
 * their direction and category follow it, and re-creating one from a list
 * would leave that record pointing at nothing. They can still be deleted —
 * the database function reverses the whole relationship — but not restored
 * from here, and not recategorised in bulk.
 */
export function isStandalone(tx: Transaction): boolean {
  return !tx.transfer_pair_id && !tx.debt_payment_id
}

type TransactionPayload = {
  type: TransactionType
  amount: number
  category_id?: string
  wallet_id?: string
  transaction_date: string
  note?: string
  /** Bank fee to fold into this transaction. `amount` above stays the BASE
   *  amount — the server stores amount + bank_fee as the total. */
  bank_fee?: number
}

export const transactionsApi = {
  create(payload: TransactionPayload): Promise<Transaction> {
    return apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: TransactionPayload): Promise<Transaction> {
    return apiFetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' })
  },

  /** Files a whole selection under one category. Rejects when any row could
   *  not take it; the rows that could are changed all the same. */
  categorizeMany(ids: string[], category_id: string): Promise<{ updated: number }> {
    return apiFetch('/api/transactions/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, category_id }),
    })
  },

  /** Removes a whole selection in one database transaction. */
  deleteMany(ids: string[]): Promise<{ deleted: number }> {
    return apiFetch('/api/transactions/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    })
  },
}
