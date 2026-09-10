import { toYMD } from './date'

export type PeriodType = 'week' | 'month' | 'quarter' | 'year'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function getPeriodLabel(period: PeriodType, start: string): string {
  if (period === 'week') {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(s); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
    return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`
  }
  if (period === 'month') {
    const [y, m] = start.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${MONTHS_SHORT[m - 1]} 1 – ${lastDay}, ${y}`
  }
  if (period === 'quarter') {
    const [y, m] = start.split('-').map(Number)
    const q = Math.ceil(m / 3)
    const endMonth = m + 2
    return `Q${q} ${y} · ${MONTHS_SHORT[m - 1]}–${MONTHS_SHORT[endMonth - 1]}`
  }
  return `${start.slice(0, 4)} · Jan–Dec`
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
