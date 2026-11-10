import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category } from '@/lib/api/categories'
import type { Wallet } from '@/lib/api/wallets'
import { categoriesQuery, walletsQuery } from './queries'
import { getRecentTransactions, type RecentTransaction } from './recent-transactions'
import { toFrequentTransactions, type FrequentTransaction } from './frequent-transactions'
import type { DebtOption } from '@/lib/types'

/** Everything the transaction form needs to render before the user types. */
export interface QuickAddData {
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  frequent: FrequentTransaction[]
  /** Powers the category suggestion and the duplicate warning as the user types. */
  recent: RecentTransaction[]
}

export async function getQuickAddData(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuickAddData> {
  const [{ data: categories }, { data: wallets }, { data: debts }, recent] = await Promise.all([
    categoriesQuery(supabase),
    walletsQuery(supabase, userId),
    // Only debts a payment can still be recorded against.
    supabase.from('debts').select('id, type, person_name, remaining_amount')
      .eq('user_id', userId).eq('status', 'active').gt('remaining_amount', 0)
      .order('person_name'),
    getRecentTransactions(supabase, userId),
  ])

  return {
    categories: (categories ?? []) as Category[],
    wallets: (wallets ?? []) as unknown as Wallet[],
    debts: (debts ?? []).map(d => ({
      id: d.id,
      type: d.type as 'lend' | 'borrow',
      person_name: d.person_name,
      remaining_amount: Number(d.remaining_amount),
    })),
    frequent: toFrequentTransactions(recent),
    recent,
  }
}
