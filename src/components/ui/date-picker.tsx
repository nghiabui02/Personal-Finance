'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toYMD } from '@/lib/utils/date'

// Week starts Monday
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Convert JS getDay() (0=Sun) to Monday-first index (0=Mon … 6=Sun)
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const days: Date[] = []

  // Padding from previous month (how many Mon-first columns to fill)
  const padCount = mondayIndex(firstDay)
  for (let i = padCount - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, -i)) // day 0 = last of prev month, -1 = day before, etc.
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }

  // Pad to 42 cells (6 rows × 7)
  while (days.length < 42) {
    const last = days[days.length - 1]
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }

  return days
}

/** Display value in DD-MM-YYYY */
function toDisplay(ymd: string): string {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${d}-${m}-${y}`
}

function todayYMD(): string {
  return toYMD(new Date())
}

interface DatePickerProps {
  label: string
  name: string
  value: string          // YYYY-MM-DD
  onChange: (value: string) => void
  required?: boolean
}

// Approximate panel height, used to pick the opening direction
const PANEL_HEIGHT = 380

type PanelPos = { top?: number; bottom?: number; left: number; width: number }

export function DatePicker({ label, name, value, onChange, required }: DatePickerProps) {
  const [open, setOpen]         = useState(false)
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null)
  const [viewYear, setViewYear]     = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth]   = useState(new Date().getMonth() + 1)
  const ref        = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  // The panel is portaled to <body> and positioned fixed: the modal card is
  // an overflow-y-auto container with an inline transform, so an absolutely
  // positioned panel gets clipped at the card's scrollport edge
  const computePanelPos = useCallback((): PanelPos | null => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(268, rect.width)

    // Anchor to whichever edge keeps the panel inside the viewport
    let left = rect.left
    const overflowsRight = rect.left + width > window.innerWidth - 8
    const fitsWhenRightAligned = rect.right - width >= 8
    if (overflowsRight && fitsWhenRightAligned) left = rect.right - width
    left = Math.max(8, Math.min(left, window.innerWidth - 8 - width))

    // Open toward the larger space when it doesn't fit below
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < PANEL_HEIGHT && rect.top > spaceBelow
    return openUpward
      ? { bottom: window.innerHeight - rect.top + 4, left, width }
      : { top: rect.bottom + 4, left, width }
  }, [])

  // Close on outside click (the panel lives outside `ref`, so check both)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Follow the trigger while open (modal body scroll, window resize)
  useEffect(() => {
    if (!open) return
    const reposition = () => setPanelPos(computePanelPos())
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, computePanelPos])

  function handleOpen() {
    if (!open) {
      // Sync calendar view to the currently selected date (or today)
      const base = value || todayYMD()
      const [y, m] = base.split('-').map(Number)
      setViewYear(y)
      setViewMonth(m)
      setPanelPos(computePanelPos())
    }
    setOpen(v => !v)
  }

  function navigate(dir: -1 | 1) {
    const d = new Date(viewYear, viewMonth - 1 + dir, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth() + 1)
  }

  function selectDay(date: Date) {
    onChange(toYMD(date))
    setOpen(false)
  }

  const today        = todayYMD()
  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const monthLabel   = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-US', {
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
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors outline-none bg-white dark:bg-gray-800 ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          {value
            ? <span className="text-gray-900 dark:text-gray-100 whitespace-nowrap truncate">{toDisplay(value)}</span>
            : <span className="text-gray-400 whitespace-nowrap">DD-MM-YYYY</span>
          }
        </span>
        {/* Right icon: × when has value and clearable, else chevron */}
        {value && !required ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Calendar panel — portaled to <body> so the modal's overflow can't clip it */}
      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[60] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3 animate-dropdown-in"
          style={{ top: panelPos.top, bottom: panelPos.bottom, left: panelPos.left, width: panelPos.width }}
        >

          {/* Month header */}
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

          {/* Day headers (Mon-first) */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((date, i) => {
              const ymd            = toYMD(date)
              const isCurrentMonth = date.getMonth() + 1 === viewMonth
              const isToday        = ymd === today
              const isSelected     = ymd === value

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
        </div>,
        document.body
      )}
    </div>
  )
}
