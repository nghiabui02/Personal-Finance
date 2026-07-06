'use client'

import { formatVND } from '@/lib/utils/currency'
import { useRouter } from 'next/navigation'
import { TabGroup } from '@/components/ui/tab-group'
import { AIInsights } from '@/app/(app)/dashboard/_components/ai-insights'
import { NetWorthChart } from '@/app/(app)/dashboard/_components/net-worth-chart'
import { CategoryChart } from './category-chart'
import { BarChart } from './bar-chart'
import type { NetWorthSnapshot } from '@/lib/types'
import type { ChartPoint, CategoryData } from './types'

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getPeriodLabel(period: PeriodType, start: string): string {
  if (period === 'week') {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(s); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
    return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${MONTHS_SHORT[m - 1]} 1 – ${lastDay}, ${y}`
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    const q = Math.ceil(m / 3)
    const endMonth = m + 2
    return `Q${q} ${y} · ${MONTHS_SHORT[m - 1]}–${MONTHS_SHORT[endMonth - 1]}`
  }
  return `${start.slice(0, 4)} · Jan–Dec`
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
  netWorth: number
  totalWalletBalance: number
  totalLent: number
  totalCreditDebt: number
  totalBorrowed: number
  netWorthSnapshots: NetWorthSnapshot[]
}

export default function ReportsClient({
  period, start, chartData, byCategory, totalIncome, totalExpense,
  netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed, netWorthSnapshots,
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
    // Use Intl to get today's date in the app timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => parseInt(parts.find(x => x.type === t)?.value ?? '0')
    const year = get('year'), month = get('month') - 1, day = get('day')
    const now = new Date(year, month, day)
    const dow = now.getDay()
    const monday = new Date(now)
    monday.setDate(day - (dow === 0 ? 6 : dow - 1))
    const defaults: Record<PeriodType, string> = {
      week:    toYMD(monday),
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

  function exportCSV() {
    const a = document.createElement('a')
    a.href = `/api/reports/export-csv?period=${period}&start=${start}`
    a.click()
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
        <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1 sm:flex-none sm:w-auto">
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
      </div>

      {/* Hero panel */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 animate-fade-up">
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
              <div className="bg-emerald-400 animate-bar-fill" style={{ width: `${savingsPct}%` }} />
              <div className="bg-rose-500 animate-bar-fill" style={{ width: `${expensePct}%`, animationDelay: '100ms' }} />
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

      {/* Net Worth */}
      <div className="bg-[#111111] dark:bg-[#0a0a0a] rounded-2xl px-5 py-5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30 mb-2">Net Worth</p>
        <p className={`text-3xl sm:text-4xl font-light tabular-nums leading-none ${netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
          {formatVND(netWorth)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <span className="text-xs tabular-nums text-emerald-400 font-medium">
            Cash&nbsp;&nbsp;{formatVND(totalWalletBalance)}
          </span>
          {totalLent > 0 && (
            <span className="text-xs tabular-nums text-emerald-400/70 font-medium">
              Lent&nbsp;&nbsp;+{formatVND(totalLent)}
            </span>
          )}
          {totalCreditDebt > 0 && (
            <span className="text-xs tabular-nums text-rose-400 font-medium">
              Credit&nbsp;&nbsp;−{formatVND(totalCreditDebt)}
            </span>
          )}
          {totalBorrowed > 0 && (
            <span className="text-xs tabular-nums text-rose-400/70 font-medium">
              Borrowed&nbsp;&nbsp;−{formatVND(totalBorrowed)}
            </span>
          )}
        </div>
      </div>

      <NetWorthChart snapshots={netWorthSnapshots} />

      <AIInsights
        periodLabel={getPeriodLabel(period, start)}
        period={period}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        categories={byCategory.map(c => ({ name: c.name, icon: c.icon, amount: c.amount }))}
      />
    </div>
  )
}
