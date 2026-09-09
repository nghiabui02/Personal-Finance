import { apiFetch } from './client'

export type Budget = {
  id: string
  category_id: string | null
  amount: number
  month: string
  rollover: boolean
  active: boolean
  spent: number
  rolloverCarry: number
  effectiveAmount: number
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

export const budgetsApi = {
  list(month: string): Promise<Budget[]> {
    return apiFetch(`/api/budgets?month=${month}`)
  },

  create(payload: { category_id?: string; amount: number; month: string; rollover?: boolean; active?: boolean }): Promise<Budget> {
    return apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: { amount?: number; rollover?: boolean; active?: boolean }): Promise<Budget> {
    return apiFetch(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/budgets/${id}`, { method: 'DELETE' })
  },
}
