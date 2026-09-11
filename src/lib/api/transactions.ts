import { apiFetch } from './client'

export type Transaction = {
  id: string
  user_id: string
  wallet_id: string | null
  category_id: string | null
  type: 'income' | 'expense'
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

type TransactionPayload = {
  type: 'income' | 'expense'
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
}
