'use client'

import { useRouter } from 'next/navigation'
import { PeriodNav } from '@/components/ui/period-nav'
import { TabGroup } from '@/components/ui/tab-group'
import {
  formatMonthDay, formatMonthYear, formatWeekdayMonthDay,
  localYMD, localYM, getMondayOfLocalWeek, shiftLocalDate,
} from '@/lib/utils/date'

export type ViewMode = 'month' | 'week' | 'day'

function getPeriodLabel(view: ViewMode, period: string): string {
  if (view === 'month') {
    const [y, m] = period.split('-').map(Number)
    return formatMonthYear(new Date(y, m - 1, 1))
  }
  if (view === 'week') {
    const start = new Date(period + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${formatMonthDay(start)} – ${formatMonthDay(end)}`
  }
  const [y, m, d] = period.split('-').map(Number)
  return formatWeekdayMonthDay(new Date(y, m - 1, d))
}

function shiftPeriod(view: ViewMode, period: string, dir: -1 | 1): string {
  if (view === 'month') {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return shiftLocalDate(period, dir * (view === 'week' ? 7 : 1))
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
    <PeriodNav
      label={getPeriodLabel(view, period)}
      onPrev={() => go(-1)}
      onNext={() => go(1)}
      labelClassName="min-w-32 tabular-nums"
    />
  )
}

interface ViewSelectorProps {
  view: ViewMode
}

export function ViewSelector({ view }: ViewSelectorProps) {
  const router = useRouter()

  function switchView(v: ViewMode) {
    const today = localYMD()
    const thisMonth = localYM()
    const thisWeek = getMondayOfLocalWeek(today)

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
