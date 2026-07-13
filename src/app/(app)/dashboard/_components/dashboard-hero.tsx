'use client'

import { formatVND } from '@/lib/utils/currency'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type Alert = {
  type: 'budget_over' | 'budget_near' | 'debt_due'
  label: string
  href: string
}

interface DashboardHeroProps {
  month: string
  totalIncome: number
  totalExpense: number
  netWorth: number
  totalWalletBalance: number
  totalLent: number
  totalCreditDebt: number
  totalBorrowed: number
  alerts: Alert[]
}

const PREV_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
)
const NEXT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
)

export function DashboardHero({
  month,
  totalIncome,
  totalExpense,
  netWorth,
  totalWalletBalance,
  totalLent,
  totalCreditDebt,
  totalBorrowed,
  alerts,
}: DashboardHeroProps) {
  const router = useRouter()

  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = month === currentYM

  function navigate(dir: -1 | 1) {
    const [year, monthNum] = month.split('-').map(Number)
    const date = new Date(year, monthNum - 1 + dir, 1)
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    router.replace(`/dashboard?month=${next}`, { scroll: false })
  }

  const [year, monthNum] = month.split('-').map(Number)
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const net = totalIncome - totalExpense
  const netPositive = net >= 0
  const savingRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : null

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous month"
          className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          {PREV_ICON}
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{monthLabel}</span>
        <button
          onClick={() => navigate(1)}
          aria-label="Next month"
          disabled={isCurrentMonth}
          className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          {NEXT_ICON}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Net cash flow */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">Net Cash Flow</p>
            {savingRate !== null && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                netPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
              }`}>
                Saving {savingRate}%
              </span>
            )}
          </div>
          <p className={`mt-3 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {netPositive ? '+' : ''}{formatVND(net)}
          </p>
          <div className="mt-auto pt-5 grid grid-cols-2">
            <div className="pr-4">
              <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Income
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(totalIncome)}</p>
            </div>
            <div className="pl-4 border-l border-gray-100 dark:border-gray-800">
              <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                Expense
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Net worth */}
        <div className="rounded-2xl bg-[#1e2836] dark:bg-[#0a0a0a] p-5 sm:p-6 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Net Worth</p>
          <p className={`mt-3 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight ${netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {formatVND(netWorth)}
          </p>
          <div className="mt-auto pt-5 flex flex-wrap gap-2">
            <span className="text-xs font-medium tabular-nums px-3 py-1.5 rounded-full bg-white/10 text-white">
              Cash {formatVND(totalWalletBalance)}
            </span>
            {totalLent > 0 && (
              <span className="text-xs font-medium tabular-nums px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-300">
                Lent +{formatVND(totalLent)}
              </span>
            )}
            {totalCreditDebt > 0 && (
              <span className="text-xs font-medium tabular-nums px-3 py-1.5 rounded-full bg-rose-400/10 text-rose-300">
                Credit −{formatVND(totalCreditDebt)}
              </span>
            )}
            {totalBorrowed > 0 && (
              <span className="text-xs font-medium tabular-nums px-3 py-1.5 rounded-full bg-rose-400/10 text-rose-300/80">
                Borrowed −{formatVND(totalBorrowed)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2 space-y-1">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <span className="text-sm shrink-0">
                {a.type === 'budget_over' ? '🔴' : '🟡'}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 leading-snug">{a.label}</span>
              <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
