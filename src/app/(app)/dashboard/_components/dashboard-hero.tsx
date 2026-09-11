'use client'

import { formatVND } from '@/lib/utils/currency'
import { localYM } from '@/lib/utils/date'
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
// Severity is carried by colour; the mark itself stays one consistent glyph
const ALERT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94 1.9 18.5a1.92 1.92 0 0 0 1.66 2.87h16.88a1.92 1.92 0 0 0 1.66-2.87L13.66 3.94a1.92 1.92 0 0 0-3.32 0Z" />
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

  const isCurrentMonth = month === localYM()

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
      {/* Month nav — the month is the subject; the arrows are plumbing */}
      <div className="flex items-center gap-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mr-2">
          {monthLabel}
        </h1>
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous month"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {PREV_ICON}
        </button>
        <button
          onClick={() => navigate(1)}
          aria-label="Next month"
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          {NEXT_ICON}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Net cash flow */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-hairline dark:border-gray-800 p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">Net cash flow</p>
            {savingRate !== null && (
              <span className={`text-[11px] font-semibold tabular-nums ${
                netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`}>
                {savingRate}% saved
              </span>
            )}
          </div>
          <p className={`mt-2.5 text-[2rem] sm:text-[2.5rem] leading-none font-semibold tabular-nums tracking-tight ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {netPositive ? '+' : ''}{formatVND(net)}
          </p>
          <div className="mt-auto pt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                Income
              </p>
              <p className="mt-1.5 text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(totalIncome)}</p>
            </div>
            <div className="pl-4 border-l border-hairline dark:border-gray-800">
              <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                Expense
              </p>
              <p className="mt-1.5 text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Net worth */}
        <div className="rounded-2xl bg-[#1e2836] dark:bg-gray-900 dark:border dark:border-gray-800 p-5 sm:p-6 flex flex-col">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">Net worth</p>
          <p className={`mt-2.5 text-[2rem] sm:text-[2.5rem] leading-none font-semibold tabular-nums tracking-tight ${netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {formatVND(netWorth)}
          </p>
          {/* Composition: one row per part, so the number above is explainable at a glance */}
          <dl className="mt-auto pt-6 space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-xs">
              <dt className="text-white/55">Cash</dt>
              <dd className="font-medium tabular-nums text-white">{formatVND(totalWalletBalance)}</dd>
            </div>
            {totalLent > 0 && (
              <div className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-white/55">Lent out</dt>
                <dd className="font-medium tabular-nums text-emerald-300">+{formatVND(totalLent)}</dd>
              </div>
            )}
            {totalCreditDebt > 0 && (
              <div className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-white/55">Credit used</dt>
                <dd className="font-medium tabular-nums text-rose-300">−{formatVND(totalCreditDebt)}</dd>
              </div>
            )}
            {totalBorrowed > 0 && (
              <div className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-white/55">Borrowed</dt>
                <dd className="font-medium tabular-nums text-rose-300">−{formatVND(totalBorrowed)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-hairline dark:border-gray-800 p-1.5 space-y-0.5">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <span className={`shrink-0 ${a.type === 'budget_over' ? 'text-rose-500' : 'text-amber-500'}`}>
                {ALERT_ICON}
              </span>
              <span className="text-[13px] text-gray-600 dark:text-gray-300 flex-1 leading-snug">{a.label}</span>
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
