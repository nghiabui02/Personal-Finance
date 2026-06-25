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
  totalAssets: number
  totalCreditDebt: number
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
  totalAssets,
  totalCreditDebt,
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

  return (
    <div className="rounded-2xl overflow-hidden bg-[#111111] dark:bg-[#0a0a0a]">
      {/* Month nav */}
      <div className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b border-white/8">
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
        >
          {PREV_ICON}
        </button>
        <span className="text-sm font-medium text-white/50 tracking-wide">{monthLabel}</span>
        <button
          onClick={() => navigate(1)}
          aria-label="Next month"
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors disabled:opacity-20 disabled:pointer-events-none"
        >
          {NEXT_ICON}
        </button>
      </div>

      {/* Cash flow — the protagonist */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30 mb-2">Net Cash Flow</p>
        <p className={`text-3xl sm:text-4xl font-light tabular-nums ${netPositive ? 'text-white' : 'text-rose-400'}`}>
          {netPositive ? '+' : ''}{formatVND(net)}
        </p>
        <div className="mt-3 flex items-center gap-5 flex-wrap">
          <span className="text-xs tabular-nums text-emerald-400 font-medium">
            ↑ {formatVND(totalIncome)}
          </span>
          <span className="text-[10px] text-white/20 select-none">·</span>
          <span className="text-xs tabular-nums text-rose-400 font-medium">
            ↓ {formatVND(totalExpense)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/8" />

      {/* Net worth */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30 mb-2">Net Worth</p>
        <p className={`text-2xl sm:text-3xl font-light tabular-nums ${netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
          {formatVND(netWorth)}
        </p>
        {(totalAssets > 0 || totalCreditDebt > 0) && (
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-xs tabular-nums text-emerald-400 font-medium">
              Assets&nbsp;&nbsp;{formatVND(totalAssets)}
            </span>
            {totalCreditDebt > 0 && (
              <>
                <span className="text-[10px] text-white/20 select-none">·</span>
                <span className="text-xs tabular-nums text-rose-400 font-medium">
                  Credit&nbsp;&nbsp;−{formatVND(totalCreditDebt)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          <div className="h-px bg-white/8 mb-1.5" />
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="flex items-center gap-2.5 bg-white/6 hover:bg-white/10 rounded-xl px-3 py-2.5 transition-colors group"
            >
              <span className="text-sm shrink-0">
                {a.type === 'budget_over' ? '🔴' : '🟡'}
              </span>
              <span className="text-[11px] text-white/60 flex-1 leading-snug">{a.label}</span>
              <svg className="w-3 h-3 text-white/20 group-hover:text-white/40 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
