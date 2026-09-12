'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { reportsApi } from '@/lib/api/reports'
import { getPeriodLabel, navigatePeriod, type PeriodType } from '@/lib/utils/period'

interface Insight {
  emoji: string
  text: string
  type: 'tip' | 'warning' | 'good'
}

interface Analysis {
  summary: string
  topSpend?: string
  assets?: string
  insights: Insight[]
  score: number
}

type PreviousPeriod = { label: string; totalIncome: number; totalExpense: number; categories: { name: string; amount: number }[] }

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

const COMPARE_OFFSETS = [1, 2, 3, 4, 5, 6]

const insightColors: Record<Insight['type'], string> = {
  warning: 'bg-rose-500/10 text-rose-300',
  tip:     'bg-indigo-500/10 text-indigo-300',
  good:    'bg-emerald-500/10 text-emerald-300',
}

// sessionStorage never notifies changes we don't make ourselves — subscribe is a no-op
const emptySubscribe = () => () => {}

export function AIInsights({ periodLabel, period, start, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo }: AIInsightsProps) {
  const abortRef = useRef<AbortController | null>(null)

  // "Compare with" picker — offset 1 = the server-provided `previous` (free,
  // no fetch); any other offset fetches that period's totals on demand.
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [compareOffset, setCompareOffset] = useState(1)
  const [customPrevious, setCustomPrevious] = useState<PreviousPeriod | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Navigating to another period/granularity re-renders this component without
  // remounting it, so a stale fetched comparison would keep being sent for the
  // wrong period — reset the picker during render (state-adjust pattern).
  const periodKey = `${period}::${start}`
  const [prevPeriodKey, setPrevPeriodKey] = useState(periodKey)
  if (prevPeriodKey !== periodKey) {
    setPrevPeriodKey(periodKey)
    setCompareOffset(1)
    setCustomPrevious(null)
    setPickerOpen(false)
  }

  const effectivePrevious = compareOffset === 1 ? previous : (customPrevious ?? previous)
  const cacheKey = `ai-insights::v8::${periodLabel}::${totalIncome}::${totalExpense}::${effectivePrevious?.label ?? ''}`

  // A period with no transactions is dropped from the prompt server-side, so
  // say it here — otherwise the analysis silently omits the comparison.
  const comparisonEmpty = effectivePrevious.totalIncome === 0 && effectivePrevious.totalExpense === 0

  async function selectCompareOffset(offset: number) {
    setCompareOffset(offset)
    setPickerOpen(false)
    if (offset === 1) { setCustomPrevious(null); return }
    setCompareLoading(true)
    try {
      const targetStart = navigatePeriod(period, start, -offset)
      const summary = await reportsApi.periodSummary(period, targetStart)
      setCustomPrevious({ label: getPeriodLabel(period, targetStart), ...summary })
    } catch { /* keep previous selection on failure */ }
    finally { setCompareLoading(false) }
  }

  // Session cache read: null on the server and during hydration, the cached
  // JSON afterwards — hydration-safe without an effect
  const cachedRaw = useSyncExternalStore(
    emptySubscribe,
    () => sessionStorage.getItem(cacheKey),
    () => null,
  )
  const cached = useMemo<Analysis | null>(() => {
    if (!cachedRaw) return null
    try { return JSON.parse(cachedRaw) } catch { return null }
  }, [cachedRaw])

  // Result and in-flight status of analyze(), keyed by the cacheKey they were
  // fired for — switching periods mid-request can't leak state across periods
  const [fetched, setFetched] = useState<{ key: string; data: Analysis } | null>(null)
  const [request, setRequest] = useState<{ key: string; status: 'loading' | 'error' | 'rate_limit' } | null>(null)
  const [retryIn, setRetryIn] = useState(0)

  const analysis = fetched?.key === cacheKey ? fetched.data : cached
  const requestStatus = request?.key === cacheKey ? request.status : null
  const state: 'idle' | 'loading' | 'done' | 'error' | 'rate_limit' =
    requestStatus ?? (analysis ? 'done' : 'idle')

  // Close the compare picker on an outside click or Escape
  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerOpen])

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (requestStatus !== 'rate_limit' || retryIn <= 0) return
    const t = setTimeout(() => {
      if (retryIn <= 1) { setRetryIn(0); setRequest(null) }
      else setRetryIn(retryIn - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [requestStatus, retryIn])

  function analyze(force = false) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const key = cacheKey
    setRequest({ key, status: 'loading' })

    fetch('/api/ai/spending-analysis', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodLabel, period, start, totalIncome, totalExpense, categories, budgets, previous: effectivePrevious, topTransactions, timeline, netWorthInfo, force }),
    })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (status === 429 || data.error === 'rate_limit') {
          setRetryIn(60); setRequest({ key, status: 'rate_limit' }); return
        }
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem(key, JSON.stringify(data))
        setFetched({ key, data })
        setRequest(null)
      })
      .catch(err => { if (err.name !== 'AbortError') setRequest({ key, status: 'error' }) })
  }

  const scoreColor = !analysis ? '' :
    analysis.score >= 70 ? 'text-emerald-400' :
    analysis.score >= 40 ? 'text-amber-400' : 'text-rose-400'

  const barColor = !analysis ? '' :
    analysis.score >= 70 ? 'bg-emerald-400' :
    analysis.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'

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

      {/* Compare-with picker */}
      <div ref={pickerRef} className="relative mb-3 -mt-1">
        <button
          onClick={() => setPickerOpen(o => !o)}
          disabled={compareLoading}
          className="text-[11px] text-white/45 hover:text-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          Compare with: {compareLoading ? 'Loading…' : getPeriodLabel(period, navigatePeriod(period, start, -compareOffset))}
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {!compareLoading && comparisonEmpty && (
          <p className="text-[11px] text-amber-500/80 mt-1">
            No transactions in that period — the analysis will skip the comparison.
          </p>
        )}
        {pickerOpen && (
          <div className="absolute z-30 mt-1 w-56 bg-slate-700 rounded-xl border border-slate-600 shadow-xl py-1 animate-dropdown-in">
            {COMPARE_OFFSETS.map(offset => (
              <button
                key={offset}
                onClick={() => selectCompareOffset(offset)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-600 ${
                  offset === compareOffset ? 'bg-slate-600 text-white font-medium' : 'text-slate-200'
                }`}
              >
                {getPeriodLabel(period, navigatePeriod(period, start, -offset))}
                {offset === 1 && <span className="text-slate-300"> · previous</span>}
              </button>
            ))}
          </div>
        )}
      </div>

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

      {/* Result */}
      {state === 'done' && analysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 text-center">
              <p className={`text-3xl font-bold tabular-nums leading-none ${scoreColor}`}>{analysis.score}</p>
              <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">score</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full animate-bar-fill ${barColor}`} style={{ width: `${analysis.score}%` }} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
            </div>
          </div>
          {analysis.topSpend && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
              <span className="text-base shrink-0">🏆</span>
              <div className="min-w-0">
                <p className="text-[10px] text-white/45 uppercase tracking-wider mb-0.5">Top spending</p>
                <p className="text-sm text-slate-200">{analysis.topSpend}</p>
              </div>
            </div>
          )}
          {analysis.assets && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
              <span className="text-base shrink-0">💼</span>
              <div className="min-w-0">
                <p className="text-[10px] text-white/45 uppercase tracking-wider mb-0.5">Current assets</p>
                <p className="text-sm text-slate-200">{analysis.assets}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {analysis.insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 animate-fade-up ${insightColors[ins.type]}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-base shrink-0 mt-0.5">{ins.emoji}</span>
                <p className="text-sm leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
