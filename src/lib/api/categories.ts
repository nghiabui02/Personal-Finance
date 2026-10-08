import { apiFetch } from './client'
import type { SystemCategoryKey, TransactionType } from '@/lib/constants'

export type Category = {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  type: TransactionType
  is_default: boolean
  parent_id: string | null
  system_key: SystemCategoryKey | null
}

/** Columns a `Category` needs — keep in sync with the type above. */
export const CATEGORY_COLUMNS = 'id, user_id, name, icon, color, type, is_default, parent_id, system_key'

export const categoriesApi = {
  create(payload: { name: string; icon?: string; color?: string; type: TransactionType }): Promise<Category> {
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
