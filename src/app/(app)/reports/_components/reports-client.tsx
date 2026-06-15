'use client'

import { formatVND } from '@/lib/utils/currency'
import { useRouter } from 'next/navigation'
import { TabGroup } from '@/components/ui/tab-group'
import { CategoryChart } from './category-chart'
import { BarChart } from './bar-chart'
import type { ChartPoint, CategoryData } from './types'

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

// ── Period helpers ─────────────────────────────────────────────────────────────

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
  return start.slice(0, 4) // year
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

// ── Props ──────────────────────────────────────────────────────────────────────

interface ReportsClientProps {
  period: PeriodType
  start: string
  chartData: ChartPoint[]
  byCategory: CategoryData[]
  totalIncome: number
  totalExpense: number
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReportsClient({
  period, start, chartData, byCategory, totalIncome, totalExpense,
}: ReportsClientProps) {
  const router = useRouter()
  const net         = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0'

  const PERIODS: { key: PeriodType; label: string }[] = [
    { key: 'week',    label: 'Week'    },
    { key: 'month',   label: 'Month'   },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year',    label: 'Year'    },
  ]

  function switchPeriod(p: PeriodType) {
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth()
    const day   = now.getDay()

    // Week → current week's Monday
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
    week:    'Daily Income vs Expense',
    month:   'Daily Income vs Expense',
    quarter: 'Monthly Income vs Expense',
    year:    'Monthly Income vs Expense',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Financial overview</p>
        </div>
      </div>

      {/* Period selector + navigator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <TabGroup
          tabs={PERIODS.map(p => ({ key: p.key, label: p.label }))}
          value={period}
          onChange={v => switchPeriod(v as PeriodType)}
        />

        {/* Navigator */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-44 text-center">
            {getPeriodLabel(period, start)}
          </span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Income',       value: totalIncome,  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Expense',      value: totalExpense, color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Net',          value: net,          color: net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bg: 'bg-white dark:bg-gray-900' },
          { label: 'Savings rate', value: null, display: `${savingsRate}%`, color: Number(savingsRate) >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300', bg: 'bg-white dark:bg-gray-900' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
            <p className={`text-sm font-semibold tabular-nums ${item.color}`}>
              {item.display ?? formatVND(item.value!)}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <BarChart data={chartData} title={chartTitle[period]} period={period} />

      {/* Category chart */}
      <CategoryChart data={byCategory} totalExpense={totalExpense} />
    </div>
  )
}
