import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Categories the app creates on the user's behalf, so a feature always has
 * somewhere to file its transactions.
 *
 * Each group below is a separate concern — debt bookkeeping, balance
 * corrections — and only shares the lookup mechanism. Add a group by adding a
 * const object and unioning its key type; the mechanism stays untouched.
 */

interface SystemCategoryDef {
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
}

/** Money moving between the user and another person. */
const DEBT_CATEGORIES = {
  lend_out:     { name: 'Lend',         type: 'expense', icon: '💸', color: '#6366f1' },
  borrow_in:    { name: 'Borrow',       type: 'income',  icon: '🤝', color: '#f97316' },
  collect_debt: { name: 'Collect Debt', type: 'income',  icon: '💰', color: '#10b981' },
  repay_debt:   { name: 'Repay Debt',   type: 'expense', icon: '🏦', color: '#ef4444' },
} as const satisfies Record<string, SystemCategoryDef>

/**
 * Corrections filed when a wallet is reconciled against the real bank balance.
 * Kept apart from real spending so reports can tell "money I spent" from
 * "drift I never recorded".
 */
const ADJUSTMENT_CATEGORIES = {
  adjust_up:   { name: 'Balance Adjustment', type: 'income',  icon: '⚖️', color: '#64748b' },
  adjust_down: { name: 'Balance Adjustment', type: 'expense', icon: '⚖️', color: '#64748b' },
} as const satisfies Record<string, SystemCategoryDef>

const ALL_SYSTEM_CATEGORIES: Record<string, SystemCategoryDef> = {
  ...DEBT_CATEGORIES,
  ...ADJUSTMENT_CATEGORIES,
}

type DebtCategoryKey = keyof typeof DEBT_CATEGORIES
type AdjustmentCategoryKey = keyof typeof ADJUSTMENT_CATEGORIES
type SystemCategoryKey = DebtCategoryKey | AdjustmentCategoryKey

/**
 * Returns the id of the user's category for `key`, creating it on first use.
 *
 * Looked up by `system_key`, not name — the display name is free to change
 * (rename, translate) without breaking the lookup. Only the key is stable.
 */
export async function ensureSystemCategory(
  supabase: SupabaseClient,
  userId: string,
  key: SystemCategoryKey,
): Promise<string> {
  const def = ALL_SYSTEM_CATEGORIES[key]

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('system_key', key)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      system_key: key,
    })
    .select('id')
    .single()

  // Swallowing this used to leave transactions silently uncategorised — the
  // caller could not tell a missing category from a rejected one.
  if (error || !created) {
    throw new Error(`Could not create the "${def.name}" category: ${error?.message ?? 'unknown error'}`)
  }

  return created.id
}
