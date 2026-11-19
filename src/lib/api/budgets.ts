import type { CategoryRef } from '@/lib/types'
import { apiFetch } from './client'

export type Budget = {
  id: string
  user_category_id: string | null
  amount: number
  month: string
  rollover: boolean
  active: boolean
  spent: number
  rolloverCarry: number
  effectiveAmount: number
  categories: CategoryRef | null
}

export const budgetsApi = {
  create(payload: { user_category_id?: string; amount: number; month: string; rollover?: boolean; active?: boolean }): Promise<Budget> {
    return apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: { amount?: number; rollover?: boolean; active?: boolean }): Promise<Budget> {
    return apiFetch(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/budgets/${id}`, { method: 'DELETE' })
  },
}
