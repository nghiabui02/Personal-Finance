'use client'

import { type PeriodType } from '@/lib/utils/period'
import type { PreviousPeriod } from './ai-insights-types'
import { AnalysisResult } from './analysis-result'
import { ComparePeriodPicker } from './compare-period-picker'
import { useComparePeriod } from './use-compare-period'
import { useSpendingAnalysis } from './use-spending-analysis'

// Everything the single caller (Reports) always has is REQUIRED on purpose:
// these were optional once and a missing `start` silently disabled the whole
// compare-period picker without tsc noticing. Only truly-absent data (no
// budgets for non-month periods) stays optional.
interface AIInsightsProps {
  periodLabel: string
  period: PeriodType
  start: string // current period's start date — drives the "compare with" picker
  totalIncome: number
  totalExpense: number
  categories: { name: string; icon: string | null; amount: number }[]
  previous: PreviousPeriod
  topTransactions: { note: string | null; category: string | null; amount: number; date: string }[]
  timeline: { label: string; income: number; expense: number }[]
  netWorthInfo: { current: number; changeAmount: number | null; changeDays: number | null }
  budgets?: { name: string; budgeted: number; spent: number }[]
}

export function AIInsights({ periodLabel, period, start, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo }: AIInsightsProps) {
  const compare = useComparePeriod({ period, start, previous })
  const cacheKey = `ai-insights::v10::${periodLabel}::${totalIncome}::${totalExpense}::${compare.effectivePrevious.label}`
  const { analysis, state, retryIn, analyze } = useSpendingAnalysis(cacheKey, {
    periodLabel, period, start, totalIncome, totalExpense, categories, budgets,
    previous: compare.effectivePrevious, topTransactions, timeline, netWorthInfo,
  })

  return (
    <div className="bg-panel dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl p-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">✨</span>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">AI Insights</p>
        <span className="ml-auto text-[10px] text-slate-700">Groq · GPT-OSS</span>
        {state === 'done' && (
          <button onClick={() => analyze(true)} title="Refresh" className="text-slate-700 hover:text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}
      </div>

      <ComparePeriodPicker
        key={`${period}::${start}`}
        period={period}
        start={start}
        offset={compare.offset}
        loading={compare.loading}
        isEmpty={compare.isEmpty}
        onSelect={compare.select}
      />

      {/* Idle — prompt to analyze */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-slate-400">Get an AI spending analysis for {periodLabel}</p>
          <button
            onClick={() => analyze()}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-colors active:scale-[0.97]"
          >
            <span>✨</span> Analyze now
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {state === 'loading' && (
        <div className="space-y-3">
          <div className="h-2.5 bg-white/10 rounded-full animate-pulse w-full" />
          <div className="h-2.5 bg-white/10 rounded-full animate-pulse w-4/5" />
          <div className="mt-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )}

      {state === 'done' && analysis && <AnalysisResult analysis={analysis} />}

      {/* Rate limit */}
      {state === 'rate_limit' && (
        <div className="text-center py-3">
          <p className="text-sm text-slate-400 mb-1">API is busy, try again shortly</p>
          <p className="text-2xl font-bold tabular-nums text-slate-300">{retryIn}s</p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center py-3">
          <p className="text-sm text-white/45 mb-2">Could not load the analysis.</p>
          <button onClick={() => analyze()} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
