'use client'

import { formatVND } from '@/lib/utils/currency'
import { useRouter } from 'next/navigation'
import { TabGroup } from '@/components/ui/tab-group'
import { CategoryChart } from './category-chart'
import { BarChart } from './bar-chart'
import type { ChartPoint, CategoryData } from './types'

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getPeriodLabel(period: PeriodType, start: string): string {
  if (period === 'week') {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(s); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    return `Q${Math.ceil(m / 3)} ${y}`
  }
  return start.slice(0, 4)
}

function navigatePeriod(period: PeriodType, start: string, dir: -1 | 1): string {
  if (period === 'week') {
    const d = new Date(start + 'T00:00:00')
    d.setDate(d.getDate() + dir * 7)
    return toYMD(d)
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    return toYMD(new Date(y, m - 1 + dir, 1))
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    return toYMD(new Date(y, m - 1 + dir * 3, 1))
  }
  const y = parseInt(start)
  return `${y + dir}-01-01`
}

interface ReportsClientProps {
  period: PeriodType
  start: string
  chartData: ChartPoint[]
  byCategory: CategoryData[]
  totalIncome: number
  totalExpense: number
}

export default function ReportsClient({
  period, start, chartData, byCategory, totalIncome, totalExpense,
}: ReportsClientProps) {
  const router = useRouter()
  const net = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0.0'
  const expensePct = totalIncome > 0 ? Math.min(100, (totalExpense / totalIncome) * 100) : 0
  const savingsPct = Math.max(0, 100 - expensePct)
  const isOverBudget = net < 0

  const PERIODS: { key: PeriodType; label: string }[] = [
    { key: 'week',    label: 'Week'    },
    { key: 'month',   label: 'Month'   },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year',    label: 'Year'    },
  ]

  function switchPeriod(p: PeriodType) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const defaults: Record<PeriodType, string> = {
      week:    toYMD(thisMonday),
      month:   toYMD(new Date(year, month, 1)),
      quarter: toYMD(new Date(year, Math.floor(month / 3) * 3, 1)),
      year:    `${year}-01-01`,
    }
    router.replace(`/reports?period=${p}&start=${defaults[p]}`, { scroll: false })
  }

  function navigate(dir: -1 | 1) {
    const next = navigatePeriod(period, start, dir)
    router.replace(`/reports?period=${period}&start=${next}`, { scroll: false })
  }

  const chartTitle: Record<PeriodType, string> = {
    week:    'Daily income vs expense',
    month:   'Daily income vs expense',
    quarter: 'Monthly income vs expense',
    year:    'Monthly income vs expense',
  }

  return (
    <div className="space-y-4">
      {/* Period selector + navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <TabGroup
          tabs={PERIODS.map(p => ({ key: p.key, label: p.label }))}
          value={period}
          onChange={v => switchPeriod(v as PeriodType)}
          className="w-full sm:w-auto"
        />
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Previous period"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {getPeriodLabel(period, start)}
          </span>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label="Next period"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hero panel */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Net Cash Flow</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isOverBudget
              ? 'bg-rose-500/15 text-rose-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}>
            {isOverBudget ? 'over budget' : `${savingsRate}% saved`}
          </span>
        </div>

        <p className={`text-[2.5rem] font-bold tabular-nums tracking-tight leading-none ${
          net >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {net >= 0 ? '+' : ''}{formatVND(net)}
        </p>

        <div className="flex gap-5 mt-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Income</p>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{formatVND(totalIncome)}</p>
          </div>
          <div className="w-px bg-slate-800 self-stretch" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Expense</p>
            <p className="text-sm font-semibold text-rose-400 tabular-nums">{formatVND(totalExpense)}</p>
          </div>
        </div>

        {totalIncome > 0 && (
          <div className="mt-5">
            <div className="flex h-1 rounded-full overflow-hidden bg-slate-800">
              <div className="bg-emerald-400" style={{ width: `${savingsPct}%` }} />
              <div className="bg-rose-500" style={{ width: `${expensePct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-[10px] text-slate-600">← savings</p>
              <p className="text-[10px] text-slate-600">spending →</p>
            </div>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <BarChart data={chartData} title={chartTitle[period]} period={period} />

      {/* Spending breakdown leaderboard */}
      <CategoryChart data={byCategory} totalExpense={totalExpense} />
    </div>
  )
}
