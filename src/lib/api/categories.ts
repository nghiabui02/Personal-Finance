import { apiFetch } from './client'
import type { SystemCategoryKey, TransactionType } from '@/lib/constants'
import type { CategoryRef } from '@/lib/types'

/** A user's category identity, including removed categories retained for history. */
export type Category = CategoryRef & {
  user_id: string
  category_id: string | null
  type: TransactionType
  system_key: SystemCategoryKey | null
  is_active: boolean
}

export type CategoryTemplate = {
  id: string
  default_key: string
  collection: string
  type: TransactionType
  icon: string | null
  color: string | null
  is_available: boolean
}

export const categoriesApi = {
  create(payload: { name: string; icon?: string; color?: string; type: TransactionType }): Promise<Category> {
    return apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: { name?: string; icon?: string; color?: string; is_active?: boolean }): Promise<Category> {
    return apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  remove(id: string): Promise<Category> {
    return categoriesApi.update(id, { is_active: false })
  },

  restore(id: string): Promise<Category> {
    return categoriesApi.update(id, { is_active: true })
  },

  /** One RPC adopts or reactivates the entire selection atomically. */
  adopt(templateIds: string[]): Promise<Category[]> {
    return apiFetch('/api/categories/adopt', { method: 'POST', body: JSON.stringify({ template_ids: templateIds }) })
  },
}
