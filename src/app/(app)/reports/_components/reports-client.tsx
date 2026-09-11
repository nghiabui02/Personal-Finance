'use client'

import { formatVND } from '@/lib/utils/currency'
import { useRouter } from 'next/navigation'
import { TabGroup } from '@/components/ui/tab-group'
import { PeriodNav } from '@/components/ui/period-nav'
import { REPORT_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { AIInsights } from './ai-insights'
import { NetWorthChart } from '@/app/(app)/dashboard/_components/net-worth-chart'
import { CategoryChart } from './category-chart'
import { BarChart } from './bar-chart'
import type { NetWorthSnapshot } from '@/lib/types'
import type { ChartPoint, CategoryData } from './types'
import { getMondayOfLocalWeek, localYMD } from '@/lib/utils/date'
import { getPeriodLabel, navigatePeriod, type PeriodType } from '@/lib/utils/period'

interface ReportsClientProps {
  period: PeriodType
  start: string
  prevStart: string
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
  aiPrevious: { totalIncome: number; totalExpense: number; categories: { name: string; amount: number }[] }
  aiTopTransactions: { note: string | null; category: string | null; amount: number; date: string }[]
  aiBudgets: { name: string; budgeted: number; spent: number }[]
  aiNetWorth: { current: number; changeAmount: number | null; changeDays: number | null }
}

export default function ReportsClient({
  period, start, prevStart, chartData, byCategory, totalIncome, totalExpense,
  netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed, netWorthSnapshots,
  aiPrevious, aiTopTransactions, aiBudgets, aiNetWorth,
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
    // Same defaults as getDefaultStart() in reports/page.tsx, app-timezone aware
    const today = localYMD()
    const [year, month] = today.split('-').map(Number)
    const defaults: Record<PeriodType, string> = {
      week:    getMondayOfLocalWeek(today),
      month:   `${today.slice(0, 7)}-01`,
      quarter: `${year}-${String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, '0')}-01`,
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
      <ScreenHeader
        eyebrow={getPeriodLabel(period, start)}
        headline={
          totalIncome === 0 && totalExpense === 0
            ? <>Nothing recorded for this period yet.</>
            : net >= 0
            ? <>You kept <Em tone="good">{formatVND(net)}</Em> of what came in{totalIncome > 0 ? <> — <Em tone="good">{savingsRate}%</Em> of it</> : null}.</>
            : <>You spent <Em tone="bad">{formatVND(-net)}</Em> more than you earned.</>
        }
        support={
          (totalIncome > 0 || totalExpense > 0) && (
            <><span>{formatVND(totalIncome)} in</span><Dot /><span>{formatVND(totalExpense)} out</span></>
          )
        }
        segments={REPORT_SEGMENTS}
        controls={
          <>
            <TabGroup
              tabs={PERIODS.map(p => ({ key: p.key, label: p.label }))}
              value={period}
              onChange={v => switchPeriod(v as PeriodType)}
              className="w-fit"
            />
            <PeriodNav label={getPeriodLabel(period, start)} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
          </>
        }
        action={
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        }
      />

      {/* How the period split between saving and spending */}
      {totalIncome > 0 && (
        <div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            <div className="bg-emerald-500 animate-bar-fill" style={{ width: `${savingsPct}%` }} />
            <div className="bg-rose-500 animate-bar-fill" style={{ width: `${expensePct}%`, animationDelay: '100ms' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <span>{isOverBudget ? 'over budget' : `${savingsRate}% saved`}</span>
            <span>{Math.round(expensePct)}% spent</span>
          </div>
        </div>
      )}

      <AIInsights
        periodLabel={getPeriodLabel(period, start)}
        period={period}
        start={start}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        categories={byCategory.map(c => ({ name: c.name, icon: c.icon, amount: c.amount }))}
        budgets={aiBudgets.length ? aiBudgets : undefined}
        previous={{ label: getPeriodLabel(period, prevStart), ...aiPrevious }}
        topTransactions={aiTopTransactions}
        timeline={chartData}
        netWorthInfo={aiNetWorth}
      />

      {/* Bar chart */}
      <BarChart data={chartData} title={chartTitle[period]} period={period} />

      {/* Spending breakdown leaderboard */}
      <CategoryChart data={byCategory} totalExpense={totalExpense} />

      {/* Net Worth */}
      <div className="bg-panel dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl px-5 py-5">
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

    </div>
  )
}
