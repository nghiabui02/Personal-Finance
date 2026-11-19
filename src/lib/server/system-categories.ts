import type { SupabaseClient } from '@supabase/supabase-js'
import { isDebtCategoryKey, type SystemCategoryKey } from '@/lib/constants'

/** System identity and appearance are derived in the database, never from client input. */
export async function ensureSystemCategory(
  supabase: SupabaseClient,
  key: SystemCategoryKey,
): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_system_category', { p_key: key })
  if (error) throw new Error(`Could not provision system category ${key}: ${error.message}`)
  return data as string
}

export async function isDebtCategory(supabase: SupabaseClient, categoryId: string | null): Promise<boolean> {
  if (!categoryId) return false
  const { data, error } = await supabase.from('user_categories').select('system_key').eq('id', categoryId).maybeSingle()
  if (error) throw error
  return isDebtCategoryKey(data?.system_key)
}
