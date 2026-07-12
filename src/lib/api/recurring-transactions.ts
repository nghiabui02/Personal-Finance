import { apiFetch } from './client'

export type RecurringTransaction = {
  id: string
  user_id: string
  wallet_id: string | null
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  note: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  next_run_date: string | null
  bank_fee: number | null
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
  wallets: { id: string; name: string } | null
}

export const FREQUENCY_LABELS: Record<RecurringTransaction['frequency'], string> = {
  daily:   'Every day',
  weekly:  'Every week',
  monthly: 'Every month',
  yearly:  'Every year',
}

export const recurringApi = {
  list(): Promise<RecurringTransaction[]> {
    return apiFetch('/api/recurring-transactions')
  },

  create(payload: {
    type: 'income' | 'expense'
    amount: number
    frequency: RecurringTransaction['frequency']
    start_date: string
    category_id?: string
    wallet_id?: string
    note?: string
    end_date?: string
    bank_fee?: number
  }): Promise<RecurringTransaction> {
    return apiFetch('/api/recurring-transactions', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: Partial<{
    amount: number
    category_id: string
    wallet_id: string
    note: string
    frequency: RecurringTransaction['frequency']
    end_date: string
    bank_fee: number | null
  }>): Promise<RecurringTransaction> {
    return apiFetch(`/api/recurring-transactions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/recurring-transactions/${id}`, { method: 'DELETE' })
  },
}
