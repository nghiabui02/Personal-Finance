import { sumRemaining } from '@/lib/utils/totals'

/**
 * The figures the spending analysis stands on: the period's length and the
 * balance sheet. No database access — the route loads the rows.
 */

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

// Days actually covered by a period starting at `start` — used for the
// per-day average. Months/quarters vary in length, so 30/91 constants would
// be off by up to 7%.
export function periodLengthInDays(periodType: PeriodType, start: string): number {
  if (periodType === 'week') return 7
  const [y, m] = start.split('-').map(Number)
  if (periodType === 'month') return new Date(y, m, 0).getDate()
  if (periodType === 'quarter') {
    return [0, 1, 2].reduce((sum, i) => {
      const mm = m + i
      return sum + new Date(mm > 12 ? y + 1 : y, mm > 12 ? mm - 12 : mm, 0).getDate()
    }, 0)
  }
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365
}

interface WalletRow { type: string; balance: number | string; credit_limit: number | string | null }
export interface DebtRow { type: string; remaining_amount: number | string; due_date: string | null }

export interface BalanceSheet {
  liquidAssets: number
  investments: number
  creditLimitTotal: number
  creditUsed: number
  receivable: number
  payable: number
  netWorth: number
}

export function summarizeBalanceSheet(walletRows: WalletRow[] | null, debtRows: DebtRow[] | null): BalanceSheet {
  const wallets = walletRows ?? []
  // An emergency fund is money you can spend today. An investment wallet holds
  // value, but selling it takes time and the figure moves with the market, so
  // counting it as cash would overstate the runway. It still belongs in net
  // worth — it is an asset, just not a liquid one.
  const investments = wallets
    .filter(w => w.type === 'investment')
    .reduce((s, w) => s + Number(w.balance), 0)
  const liquidAssets = wallets
    .filter(w => w.type !== 'credit' && w.type !== 'investment')
    .reduce((s, w) => s + Number(w.balance), 0)
  const creditWallets = wallets.filter(w => w.type === 'credit' && Number(w.credit_limit) > 0)
  const creditLimitTotal = creditWallets.reduce((s, w) => s + Number(w.credit_limit), 0)
  const creditUsed = creditWallets.reduce((s, w) => s + Math.max(0, Number(w.credit_limit) - Number(w.balance)), 0)
  const receivable = sumRemaining(debtRows ?? [], 'lend')
  const payable = sumRemaining(debtRows ?? [], 'borrow')
  const netWorth = liquidAssets + investments + receivable - creditUsed - payable
  return { liquidAssets, investments, creditLimitTotal, creditUsed, receivable, payable, netWorth }
}
