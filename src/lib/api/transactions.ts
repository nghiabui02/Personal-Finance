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
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
  wallets: { id: string; name: string } | null
}

export type TransactionPayload = {
  type: 'income' | 'expense'
  amount: number
  category_id?: string
  wallet_id?: string
  transaction_date: string
  note?: string
}

export const transactionsApi = {
  list(month?: string): Promise<Transaction[]> {
    const qs = month ? `?month=${month}` : ''
    return apiFetch(`/api/transactions${qs}`)
  },

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
