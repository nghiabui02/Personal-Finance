'use client'

import { useEffect, useRef, useState } from 'react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const days: Date[] = []

  // Padding from previous month
  for (let i = firstDay.getDay() - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, -i))
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }
  // Pad to 42 cells (6 rows)
  while (days.length < 42) {
    const last = days[days.length - 1]
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }
  return days
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDisplay(value: string): string {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  return `${d}-${m}-${y}`
}

interface DatePickerProps {
  label: string
  name: string
  value: string         // YYYY-MM-DD
  onChange: (value: string) => void
  required?: boolean
}

export function DatePicker({ label, name, value, onChange, required }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = toDateString(new Date())
  const [viewYear, setViewYear] = useState(() => {
    if (value) return Number(value.split('-')[0])
    return new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return Number(value.split('-')[1])
    return new Date().getMonth() + 1
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function navigate(dir: -1 | 1) {
    const date = new Date(viewYear, viewMonth - 1 + dir, 1)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth() + 1)
  }

  function selectDay(date: Date) {
    onChange(toDateString(date))
    setOpen(false)
  }

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={value} required={required} />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors outline-none ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } bg-white dark:bg-gray-800`}
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          {value ? (
            <span className="text-gray-900 dark:text-gray-100">{formatDisplay(value)}</span>
          ) : (
            <span className="text-gray-400">Pick a date</span>
          )}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Calendar */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{monthLabel}</span>
            <button type="button" onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((date, i) => {
              const dateStr = toDateString(date)
              const isCurrentMonth = date.getMonth() + 1 === viewMonth
              const isToday = dateStr === today
              const isSelected = dateStr === value

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(date)}
                  className={`
                    w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-colors
                    ${isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : isToday
                      ? 'ring-2 ring-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                      : isCurrentMonth
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          {value !== today && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
              <button type="button" onClick={() => { onChange(today); setOpen(false) }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
