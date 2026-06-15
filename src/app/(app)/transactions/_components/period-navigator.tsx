'use client'

import { useRouter } from 'next/navigation'
import { TabGroup } from '@/components/ui/tab-group'

export type ViewMode = 'month' | 'week' | 'day'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function getPeriodLabel(view: ViewMode, period: string): string {
  if (view === 'month') {
    const [y, m] = period.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (view === 'week') {
    const start = new Date(period + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${s} – ${e}`
  }
  const [y, m, d] = period.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function shiftPeriod(view: ViewMode, period: string, dir: -1 | 1): string {
  if (view === 'month') {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const date = new Date(period + 'T00:00:00')
  date.setDate(date.getDate() + dir * (view === 'week' ? 7 : 1))
  return date.toISOString().slice(0, 10)
}

function buildUrl(view: ViewMode, period: string): string {
  const key = view === 'month' ? 'month' : view === 'week' ? 'week' : 'date'
  return `/transactions?view=${view}&${key}=${period}`
}

interface PeriodNavigatorProps {
  view: ViewMode
  period: string
}

export function PeriodNavigator({ view, period }: PeriodNavigatorProps) {
  const router = useRouter()

  function go(dir: -1 | 1) {
    router.replace(buildUrl(view, shiftPeriod(view, period, dir)), { scroll: false })
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => go(-1)}
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span className="px-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-32 text-center tabular-nums">
        {getPeriodLabel(view, period)}
      </span>
      <button
        onClick={() => go(1)}
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}

interface ViewSelectorProps {
  view: ViewMode
}

export function ViewSelector({ view }: ViewSelectorProps) {
  const router = useRouter()
  const now = new Date()

  function switchView(v: ViewMode) {
    const today = now.toISOString().slice(0, 10)
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisWeek = getMondayOfWeek(now)

    const urls: Record<ViewMode, string> = {
      month: `/transactions?view=month&month=${thisMonth}`,
      week:  `/transactions?view=week&week=${thisWeek}`,
      day:   `/transactions?view=day&date=${today}`,
    }
    router.replace(urls[v], { scroll: false })
  }

  return (
    <TabGroup
      tabs={[
        { key: 'month', label: 'Month' },
        { key: 'week', label: 'Week' },
        { key: 'day', label: 'Day' },
      ]}
      value={view}
      onChange={switchView}
    />
  )
}
