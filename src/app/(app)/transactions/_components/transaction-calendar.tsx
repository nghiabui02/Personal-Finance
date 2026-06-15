'use client'

import { useRouter } from 'next/navigation'
import { type Transaction } from '@/lib/api/transactions'

interface TransactionCalendarProps {
  transactions: Transaction[]
  period: string // YYYY-MM
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}

function formatNet(net: number): string {
  const abs = Math.abs(net)
  let s: string
  if (abs >= 1_000_000) s = `${+(abs / 1_000_000).toFixed(1)}M`
  else if (abs >= 1_000) s = `${Math.round(abs / 1_000)}k`
  else s = String(Math.round(abs))
  return (net > 0 ? '+' : '−') + s
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function TransactionCalendar({
  transactions,
  period,
  selectedDate,
  onSelectDate,
}: TransactionCalendarProps) {
  const router = useRouter()
  const [year, month] = period.split('-').map(Number)
  const today = new Date().toISOString().slice(0, 10)

  // Build daily net map
  const dailyNet = new Map<string, number>()
  for (const tx of transactions) {
    const d = tx.transaction_date
    dailyNet.set(d, (dailyNet.get(d) ?? 0) + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)))
  }

  // Build calendar grid (Monday-first)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const offset = (firstDow + 6) % 7

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function navigateMonth(dir: 1 | -1) {
    const d = new Date(year, month - 1 + dir, 1)
    const newPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.replace(`/transactions?view=month&month=${newPeriod}`, { scroll: false })
    onSelectDate(null)
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 lg:sticky">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</span>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />

          const dateStr = `${period}-${String(day).padStart(2, '0')}`
          const net = dailyNet.get(dateStr)
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === today
          const hasData = net !== undefined

          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`
                flex flex-col items-center justify-start pt-1.5 pb-1 px-0.5 rounded-lg min-h-11 sm:min-h-11.5
                transition-all duration-150 ease-out active:scale-95
                ${isSelected
                  ? 'bg-blue-600 dark:bg-blue-500 scale-[1.08] shadow-md shadow-blue-500/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.04]'}
              `}
            >
              {/* Day number */}
              <span className={`
                text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full
                ${isSelected
                  ? 'text-white'
                  : isToday
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300'}
              `}>
                {day}
              </span>

              {/* Net amount */}
              {hasData && (
                <span className={`
                  text-[9px] font-semibold leading-none mt-1 tabular-nums
                  ${isSelected
                    ? 'text-white/90'
                    : net! > 0
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'}
                `}>
                  {formatNet(net!)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date hint */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
          <button
            onClick={() => onSelectDate(null)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Show all
          </button>
        </div>
      )}
    </div>
  )
}
