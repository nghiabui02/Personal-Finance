import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_COLUMNS, type Category } from '@/lib/api/categories'
import { WALLET_COLUMNS, type Wallet } from '@/lib/api/wallets'
import { getFrequentTransactions, type FrequentTransaction } from './frequent-transactions'
import type { DebtOption } from '@/lib/types'

/** Everything the transaction form needs to render before the user types. */
export interface QuickAddData {
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  frequent: FrequentTransaction[]
}

export async function getQuickAddData(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuickAddData> {
  const [{ data: categories }, { data: wallets }, { data: debts }, frequent] = await Promise.all([
    supabase.from('categories').select(CATEGORY_COLUMNS)
      .order('is_default', { ascending: false }).order('name'),
    supabase.from('wallets').select(WALLET_COLUMNS)
      .eq('user_id', userId).order('is_default', { ascending: false }).order('name'),
    // Only debts a payment can still be recorded against.
    supabase.from('debts').select('id, type, person_name, remaining_amount')
      .eq('user_id', userId).eq('status', 'active').gt('remaining_amount', 0),
    getFrequentTransactions(supabase, userId),
  ])

  return {
    categories: (categories ?? []) as Category[],
    wallets: (wallets ?? []) as Wallet[],
    debts: (debts ?? []).map(d => ({
      id: d.id,
      type: d.type as 'lend' | 'borrow',
      person_name: d.person_name,
      remaining_amount: Number(d.remaining_amount),
    })),
    frequent,
  }
}
