import type { SupabaseClient } from '@supabase/supabase-js'
import { readAllById } from './read-all-by-id'
import { localYMD } from '@/lib/utils/date'

// Minimal row shapes so callers can select only the columns they need.
type WalletBalanceRow = {
  type: string
  balance: number | string
  credit_limit: number | string | null
}

type DebtBalanceRow = {
  type: string
  status: string
  remaining_amount: number | string
}

type NetWorthBreakdown = {
  totalWalletBalance: number
  totalCreditDebt: number
  totalLent: number
  totalBorrowed: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

// netWorth = (non-credit wallet balances + active lends) − (credit card debt + active borrows)
function computeNetWorth(
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
async function recordNetWorthSnapshot(
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

/** Only persist a snapshot after both complete, owner-scoped reads succeed. */
export async function getNetWorthSnapshot(supabase: SupabaseClient, userId: string) {
  const [wallets, debts] = await Promise.all([
    readAllById('wallet balances', () => supabase.from('wallets')
      .select('id, type, balance, credit_limit', { count: 'exact' }).eq('user_id', userId)),
    readAllById('debt balances', () => supabase.from('debts')
      .select('id, type, remaining_amount, status, due_date, person_name', { count: 'exact' }).eq('user_id', userId)),
  ])
  const sheet = computeNetWorth(wallets, debts)
  await recordNetWorthSnapshot(supabase, userId, sheet.netWorth)
  return { ...sheet, debts }
}
