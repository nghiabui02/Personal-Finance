import type { SupabaseClient } from '@supabase/supabase-js'

// Loan principal and ledger corrections change balances, not earned income or spending.
const NON_OPERATING_GROUPS: Partial<Record<string, 'debt' | 'adjustment'>> = {
  lend_out: 'debt',
  borrow_in: 'debt',
  collect_debt: 'debt',
  repay_debt: 'debt',
  adjust_up: 'adjustment',
  adjust_down: 'adjustment',
}

type ReportingTransaction = {
  type: string
  amount: number | string
  transfer_pair_id?: string | null
  categories: { system_key?: string | null } | null
}

export type NonOperatingFlows = {
  debtIncome: number
  debtExpense: number
  adjustmentIncome: number
  adjustmentExpense: number
}

export function getReportingGroup(tx: Pick<ReportingTransaction, 'transfer_pair_id' | 'categories'>) {
  if (tx.transfer_pair_id) return 'transfer'
  return NON_OPERATING_GROUPS[tx.categories?.system_key ?? ''] ?? 'operating'
}

export function summarizeNonOperatingFlows(rows: ReportingTransaction[]): NonOperatingFlows {
  const totals = { debtIncome: 0, debtExpense: 0, adjustmentIncome: 0, adjustmentExpense: 0 }
  for (const tx of rows) {
    const group = getReportingGroup(tx)
    if (group !== 'debt' && group !== 'adjustment') continue
    const direction = tx.type === 'income' ? 'Income' : 'Expense'
    totals[`${group}${direction}`] += Number(tx.amount)
  }
  return totals
}

export async function getNonOperatingCategoryIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('categories').select('id')
    .eq('user_id', userId).in('system_key', Object.keys(NON_OPERATING_GROUPS))
  if (error) throw new Error(`Could not load report categories: ${error.message}`)
  return (data ?? []).map(category => category.id)
}

interface OperatingQuery<T> {
  is(column: string, value: null): T
  or(filters: string): T
}

export function onlyOperatingTransactions<T extends OperatingQuery<T>>(query: T, excludedIds: string[]): T {
  const operating = query.is('transfer_pair_id', null)
  // NOT IN alone drops NULL categories too; uncategorized income/spending still counts.
  return excludedIds.length
    ? operating.or(`category_id.is.null,category_id.not.in.(${excludedIds.join(',')})`)
    : operating
}
