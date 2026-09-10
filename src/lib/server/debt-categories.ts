import { SupabaseClient } from '@supabase/supabase-js'

const DEBT_CATEGORIES = {
  lend_out:     { name: 'Lend',         type: 'expense', icon: '💸', color: '#6366f1' },
  borrow_in:    { name: 'Borrow',       type: 'income',  icon: '🤝', color: '#f97316' },
  collect_debt: { name: 'Collect Debt', type: 'income',  icon: '💰', color: '#10b981' },
  repay_debt:   { name: 'Repay Debt',   type: 'expense', icon: '🏦', color: '#ef4444' },
} as const

type DebtCategoryKey = keyof typeof DEBT_CATEGORIES

// Looked up by `system_key`, not name — display name is free to change
// (rename, translate) without breaking this. Only the key is stable.
export async function ensureDebtCategory(
  supabase: SupabaseClient,
  userId: string,
  key: DebtCategoryKey,
): Promise<string | null> {
  const def = DEBT_CATEGORIES[key]

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('system_key', key)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: def.name, type: def.type, icon: def.icon, color: def.color, system_key: key })
    .select('id')
    .single()

  return created?.id ?? null
}
