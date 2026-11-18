import { apiFetch } from './client'
import type { SystemCategoryKey, TransactionType } from '@/lib/constants'

export type Category = {
  id: string
  user_id: string | null
  name: string
  default_key: string | null
  name_is_custom: boolean
  icon: string | null
  color: string | null
  type: TransactionType
  is_default: boolean
  parent_id: string | null
  system_key: SystemCategoryKey | null
  /** The Store template this category was added from; null for custom and system categories. */
  source_template_id: string | null
}

/** Columns a `Category` needs — keep in sync with the type above. */
export const CATEGORY_COLUMNS = 'id, user_id, name, icon, color, type, is_default, parent_id, system_key, default_key, name_is_custom, source_template_id'

export const categoriesApi = {
  create(payload: { name: string; icon?: string; color?: string; type: TransactionType }): Promise<Category> {
    return apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: { name?: string; icon?: string; color?: string }): Promise<Category> {
    return apiFetch(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
  },

  /** Adds a Store template to the user's categories. Adding one twice returns the same category. */
  adopt(templateId: string): Promise<Category> {
    return apiFetch('/api/categories/adopt', {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId }),
    })
  },
}
