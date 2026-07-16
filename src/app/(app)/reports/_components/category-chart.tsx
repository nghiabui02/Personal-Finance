'use client'

import { useEffect, useState } from 'react'
import { formatVND } from '@/lib/utils/currency'
import type { CategoryData } from './types'

const FALLBACK_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899',
]

export function CategoryChart({ data, totalExpense }: { data: CategoryData[]; totalExpense: number }) {
  const [ready, setReady] = useState(false)

  // Restart the bar-fill animation when the data changes: reset during render
  // (state-adjust pattern), then arm the timer that flips bars to full width
  const [prevData, setPrevData] = useState(data)
  if (prevData !== data) {
    setPrevData(data)
    setReady(false)
  }

  useEffect(() => {
    if (ready) return
    const id = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(id)
  }, [ready])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
        Spending Breakdown
      </p>

      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">
          No expense data for this period
        </div>
      ) : (
        <ul className="space-y-4">
          {data.map((item, i) => {
            const color = item.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
            const pct = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
            return (
              <li key={item.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm leading-none w-5 text-center shrink-0">
                    {item.icon ?? '·'}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate min-w-0">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums shrink-0 w-9 text-right">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                    {formatVND(item.amount)}
                  </span>
                </div>
                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: ready ? `${pct}%` : '0%',
                      backgroundColor: color,
                      transition: ready
                        ? `width 600ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 55}ms`
                        : 'none',
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
