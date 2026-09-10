import { apiFetch } from './client'

export type Category = {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  type: 'income' | 'expense'
  is_default: boolean
  parent_id: string | null
  system_key: 'lend_out' | 'borrow_in' | 'collect_debt' | 'repay_debt' | null
}

export const categoriesApi = {
  list(type?: 'income' | 'expense'): Promise<Category[]> {
    const qs = type ? `?type=${type}` : ''
    return apiFetch(`/api/categories${qs}`)
  },

  create(payload: { name: string; icon?: string; color?: string; type: 'income' | 'expense' }): Promise<Category> {
    return apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: { name: string; icon?: string; color?: string }): Promise<Category> {
    return apiFetch(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
  },
}
