import type { CategoryRef } from '@/lib/types'
import { apiFetch } from './client'
import type { RecurringFrequency, TransactionType } from '@/lib/constants'

export type RecurringTransaction = {
  id: string
  user_id: string
  wallet_id: string | null
  user_category_id: string | null
  type: TransactionType
  amount: number
  note: string | null
  frequency: RecurringFrequency
  start_date: string
  end_date: string | null
  next_run_date: string | null
  bank_fee: number | null
  active: boolean
  categories: CategoryRef | null
  wallets: { id: string; name: string } | null
}

export const recurringApi = {
  create(payload: {
    type: TransactionType
    amount: number
    frequency: RecurringTransaction['frequency']
    start_date: string
    user_category_id?: string
    wallet_id?: string
    note?: string
    end_date?: string
    bank_fee?: number
  }): Promise<RecurringTransaction> {
    return apiFetch('/api/recurring-transactions', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: Partial<{
    amount: number
    user_category_id: string
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

  skip(id: string): Promise<RecurringTransaction> {
    return apiFetch(`/api/recurring-transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ skip: true }) })
  },

  setActive(id: string, active: boolean): Promise<RecurringTransaction> {
    return apiFetch(`/api/recurring-transactions/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
  },
}
