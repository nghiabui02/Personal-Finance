'use client'

import { useEffect, useRef, useState } from 'react'

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

interface AIInsightsProps {
  periodLabel: string
  period?: 'week' | 'month' | 'quarter' | 'year'
  totalIncome: number
  totalExpense: number
  categories: { name: string; icon: string | null; amount: number }[]
  budgets?: { name: string; budgeted: number; spent: number }[]
  previous?: { label: string; totalIncome: number; totalExpense: number; categories: { name: string; amount: number }[] }
  topTransactions?: { note: string | null; category: string | null; amount: number; date: string }[]
  timeline?: { label: string; income: number; expense: number }[]
  netWorthInfo?: { current: number; changeAmount: number | null; changeDays: number | null }
}

const insightColors: Record<Insight['type'], string> = {
  warning: 'bg-rose-500/10 text-rose-300',
  tip:     'bg-blue-500/10 text-blue-300',
  good:    'bg-emerald-500/10 text-emerald-300',
}

export function AIInsights({ periodLabel, period = 'month', totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo }: AIInsightsProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'rate_limit'>('idle')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [retryIn, setRetryIn] = useState(0)
  const cacheKey = `ai-insights::v6::${periodLabel}::${totalIncome}::${totalExpense}`
  const abortRef = useRef<AbortController | null>(null)

  // Load from cache on mount (no API call)
  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setAnalysis(JSON.parse(cached)); setState('done') } catch { /* ignore */ }
    } else {
      setState('idle')
      setAnalysis(null)
    }
  }, [cacheKey])

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (state !== 'rate_limit' || retryIn <= 0) return
    const t = setInterval(() => setRetryIn(n => {
      if (n <= 1) { clearInterval(t); setState('idle'); return 0 }
      return n - 1
    }), 1000)
    return () => clearInterval(t)
  }, [state, retryIn])

  function analyze(force = false) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState('loading')

    fetch('/api/ai/spending-analysis', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodLabel, period, totalIncome, totalExpense, categories, budgets, previous, topTransactions, timeline, netWorthInfo, force }),
    })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (status === 429 || data.error === 'rate_limit') {
          setRetryIn(60); setState('rate_limit'); return
        }
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem(cacheKey, JSON.stringify(data))
        setAnalysis(data)
        setState('done')
      })
      .catch(err => { if (err.name !== 'AbortError') setState('error') })
  }

  const scoreColor = !analysis ? '' :
    analysis.score >= 70 ? 'text-emerald-400' :
    analysis.score >= 40 ? 'text-amber-400' : 'text-rose-400'

  const barColor = !analysis ? '' :
    analysis.score >= 70 ? 'bg-emerald-400' :
    analysis.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">✨</span>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">AI Insights</p>
        <span className="ml-auto text-[10px] text-slate-700">Groq · GPT-OSS</span>
        {state === 'done' && (
          <button onClick={() => analyze(true)} title="Refresh" className="text-slate-700 hover:text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}
      </div>

      {/* Idle — prompt to analyze */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-slate-400">Nhận phân tích chi tiêu AI cho {periodLabel}</p>
          <button
            onClick={() => analyze()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-colors active:scale-[0.97]"
          >
            <span>✨</span> Phân tích ngay
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {state === 'loading' && (
        <div className="space-y-3">
          <div className="h-2.5 bg-slate-800 rounded-full animate-pulse w-full" />
          <div className="h-2.5 bg-slate-800 rounded-full animate-pulse w-4/5" />
          <div className="mt-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-800/60 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
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
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">score</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full animate-bar-fill ${barColor}`} style={{ width: `${analysis.score}%` }} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
            </div>
          </div>
          {analysis.topSpend && (
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-base shrink-0">🏆</span>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Chi nhiều nhất</p>
                <p className="text-sm text-slate-200">{analysis.topSpend}</p>
              </div>
            </div>
          )}
          {analysis.assets && (
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-base shrink-0">💼</span>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Tài sản hiện tại</p>
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
          <p className="text-sm text-slate-400 mb-1">API đang bận, thử lại sau</p>
          <p className="text-2xl font-bold tabular-nums text-slate-300">{retryIn}s</p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center py-3">
          <p className="text-sm text-slate-500 mb-2">Không thể tải phân tích.</p>
          <button onClick={() => analyze()} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">
            Thử lại
          </button>
        </div>
      )}
    </div>
  )
}
