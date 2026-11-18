import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { reportsApi } from '@/lib/api/reports'
import { toastError } from '@/components/ui/toast'
import { getPeriodLabel, navigatePeriod, type PeriodType } from '@/lib/utils/period'
import type { PreviousPeriod } from './ai-insights-types'

/** The selected comparison survives a language change; translated data is reloaded. */
export function useComparePeriod({ period, start, previous }: {
  period: PeriodType
  start: string
  previous: PreviousPeriod
}) {
  const locale = useLocale()
  const t = useTranslations('reports')
  const [offset, setOffset] = useState(1)
  const [retryVersion, setRetryVersion] = useState(0)
  const [customPrevious, setCustomPrevious] = useState<{ key: string; value: PreviousPeriod } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const requestVersion = useRef(0)
  const periodKey = `${period}::${start}`
  const [previousPeriodKey, setPreviousPeriodKey] = useState(periodKey)
  if (previousPeriodKey !== periodKey) {
    setPreviousPeriodKey(periodKey)
    setOffset(1)
    setCustomPrevious(null)
  }

  const key = `${locale}::${periodKey}::${offset}::${retryVersion}`
  const targetStart = navigatePeriod(period, start, -offset)
  const effectivePrevious = offset === 1 ? previous : customPrevious?.key === key ? customPrevious.value : {
    period, start: targetStart, label: getPeriodLabel(period, targetStart, locale), totalIncome: 0, totalExpense: 0, categories: [],
  }
  const ready = offset === 1 || customPrevious?.key === key
  const loading = offset !== 1 && customPrevious?.key !== key && failedKey !== key

  useEffect(() => {
    const version = ++requestVersion.current
    if (offset === 1) return
    let cancelled = false
    reportsApi.periodSummary(period, targetStart).then(summary => {
      if (cancelled || version !== requestVersion.current) return
      setCustomPrevious({ key, value: { period, start: targetStart, label: getPeriodLabel(period, targetStart, locale), ...summary } })
    }).catch(error => {
      if (cancelled || version !== requestVersion.current) return
      setFailedKey(key)
      toastError(error, t('comparisonFailed'))
    })
    return () => { cancelled = true }
  }, [key, locale, offset, period, targetStart, t])

  return {
    offset, loading, ready, effectivePrevious,
    isEmpty: ready && effectivePrevious.totalIncome === 0 && effectivePrevious.totalExpense === 0,
    select: (next: number) => { setOffset(next); setRetryVersion(value => value + 1) },
  }
}
