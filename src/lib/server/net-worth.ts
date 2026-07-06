import type { SupabaseClient } from '@supabase/supabase-js'
import { localYMD } from '@/lib/utils/date'

// Minimal row shapes so callers can select only the columns they need.
export type WalletBalanceRow = {
  type: string
  balance: number | string
  credit_limit: number | string | null
}

export type DebtBalanceRow = {
  type: string
  status: string
  remaining_amount: number | string
}

export type NetWorthBreakdown = {
  totalWalletBalance: number
  totalCreditDebt: number
  totalLent: number
  totalBorrowed: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

// netWorth = (non-credit wallet balances + active lends) − (credit card debt + active borrows)
export function computeNetWorth(
  wallets: WalletBalanceRow[],
  debts: DebtBalanceRow[],
): NetWorthBreakdown {
  let totalWalletBalance = 0
  let totalCreditDebt = 0
  for (const w of wallets) {
    if (w.type === 'credit') {
      totalCreditDebt += Math.max(0, Number(w.credit_limit ?? 0) - Number(w.balance))
    } else {
      totalWalletBalance += Number(w.balance)
    }
  }

  let totalLent = 0
  let totalBorrowed = 0
  for (const d of debts) {
    if (d.status !== 'active' || Number(d.remaining_amount) <= 0) continue
    if (d.type === 'lend') totalLent += Number(d.remaining_amount)
    else totalBorrowed += Number(d.remaining_amount)
  }

  const totalAssets = totalWalletBalance + totalLent
  const totalLiabilities = totalCreditDebt + totalBorrowed
  return {
    totalWalletBalance,
    totalCreditDebt,
    totalLent,
    totalBorrowed,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  }
}

// Upserts today's snapshot so the history chart stays current.
export async function recordNetWorthSnapshot(
  supabase: SupabaseClient,
  userId: string,
  netWorth: number,
): Promise<void> {
  const { error } = await supabase.from('net_worth_snapshots').upsert(
    { user_id: userId, net_worth: netWorth, recorded_date: localYMD() },
    { onConflict: 'user_id,recorded_date' },
  )
  if (error) console.error('[net-worth] snapshot upsert failed:', error.message)
}
