import { useState } from 'react'
import { reportsApi } from '@/lib/api/reports'
import { getPeriodLabel, navigatePeriod, type PeriodType } from '@/lib/utils/period'
import type { PreviousPeriod } from './ai-insights-types'

/**
 * Which earlier period the analysis is compared with.
 *
 * Offset 1 is the previous period the server already sent, so choosing it
 * costs nothing; any other offset fetches that period's totals on demand.
 */
export function useComparePeriod({
  period,
  start,
  previous,
}: {
  period: PeriodType
  start: string
  previous: PreviousPeriod
}) {
  const [offset, setOffset] = useState(1)
  const [customPrevious, setCustomPrevious] = useState<PreviousPeriod | null>(null)
  const [loading, setLoading] = useState(false)

  // Navigating to another period/granularity re-renders this component without
  // remounting it, so a stale fetched comparison would keep being sent for the
  // wrong period — reset during render (state-adjust pattern).
  const periodKey = `${period}::${start}`
  const [prevPeriodKey, setPrevPeriodKey] = useState(periodKey)
  if (prevPeriodKey !== periodKey) {
    setPrevPeriodKey(periodKey)
    setOffset(1)
    setCustomPrevious(null)
  }

  const effectivePrevious = offset === 1 ? previous : (customPrevious ?? previous)

  // A period with no transactions is dropped from the prompt server-side, so
  // say it in the screen — otherwise the analysis silently omits the comparison.
  const isEmpty = effectivePrevious.totalIncome === 0 && effectivePrevious.totalExpense === 0

  async function select(nextOffset: number) {
    setOffset(nextOffset)
    if (nextOffset === 1) { setCustomPrevious(null); return }
    setLoading(true)
    try {
      const targetStart = navigatePeriod(period, start, -nextOffset)
      const summary = await reportsApi.periodSummary(period, targetStart)
      setCustomPrevious({ label: getPeriodLabel(period, targetStart), ...summary })
    } catch { /* keep previous selection on failure */ }
    finally { setLoading(false) }
  }

  return { offset, loading, effectivePrevious, isEmpty, select }
}
