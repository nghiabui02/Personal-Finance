import { apiFetch } from './client'
import type { PeriodType } from '@/lib/utils/period'

export type PeriodSummary = {
  totalIncome: number
  totalExpense: number
  categories: { name: string; amount: number }[]
}

export const reportsApi = {
  periodSummary(period: PeriodType, start: string): Promise<PeriodSummary> {
    return apiFetch(`/api/reports/period-summary?period=${period}&start=${start}`)
  },
}
