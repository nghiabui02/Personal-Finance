import { toYMD } from './date'

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

export function getPeriodLabel(period: PeriodType, start: string, locale = 'vi'): string {
  const months = Array.from({ length: 12 }, (_, month) => new Date(2026, month, 1).toLocaleDateString(locale, { month: 'short' }))
  if (period === 'week' || period === 'month') {
    const first = new Date(start + 'T00:00:00')
    const last = new Date(first)
    if (period === 'week') last.setDate(first.getDate() + 6)
    else last.setMonth(first.getMonth() + 1, 0)
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(first, last)
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    const q = Math.ceil(m / 3)
    const endMonth = m + 2
    return `${locale === 'en' ? 'Q' : 'Quý '}${q} ${y} · ${months[m - 1]}–${months[endMonth - 1]}`
  }
  return `${start.slice(0, 4)} · ${months[0]}–${months[11]}`
}

// Shifts `start` by `dir` whole periods of `period` (±1 = adjacent, but works for any integer).
export function navigatePeriod(period: PeriodType, start: string, dir: number): string {
  if (period === 'week') {
    const d = new Date(start + 'T00:00:00')
    d.setDate(d.getDate() + dir * 7)
    return toYMD(d)
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    return toYMD(new Date(y, m - 1 + dir, 1))
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    return toYMD(new Date(y, m - 1 + dir * 3, 1))
  }
  const y = parseInt(start)
  return `${y + dir}-01-01`
}
