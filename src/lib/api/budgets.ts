import { apiFetch } from './client'

export type Budget = {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  month: string
  spent: number
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

export const budgetsApi = {
  list(month: string): Promise<Budget[]> {
    return apiFetch(`/api/budgets?month=${month}`)
  },

  create(payload: { category_id?: string; amount: number; month: string }): Promise<Budget> {
    return apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, amount: number): Promise<Budget> {
    return apiFetch(`/api/budgets/${id}`, { method: 'PATCH', body: JSON.stringify({ amount }) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/budgets/${id}`, { method: 'DELETE' })
  },
}
