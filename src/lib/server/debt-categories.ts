import { SupabaseClient } from '@supabase/supabase-js'

const DEBT_CATEGORIES = {
  lend_out:     { name: 'Cho vay', type: 'expense', icon: '💸', color: '#6366f1' },
  borrow_in:    { name: 'Đi vay',  type: 'income',  icon: '🤝', color: '#f97316' },
  collect_debt: { name: 'Thu nợ', type: 'income',  icon: '💰', color: '#10b981' },
  repay_debt:   { name: 'Trả nợ', type: 'expense', icon: '🏦', color: '#ef4444' },
} as const

type DebtCategoryKey = keyof typeof DEBT_CATEGORIES

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
    .eq('name', def.name)
    .eq('type', def.type)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: def.name, type: def.type, icon: def.icon, color: def.color })
    .select('id')
    .single()

  return created?.id ?? null
}
