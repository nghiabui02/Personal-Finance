import { apiFetch } from './client'

export type MonthlyData = { month: string; income: number; expense: number }
export type CategoryData = { id: string; name: string; icon: string | null; color: string | null; amount: number }

export type ReportData = {
  year: number
  monthly: MonthlyData[]
  byCategory: CategoryData[]
  totalIncome: number
  totalExpense: number
}

export const reportsApi = {
  get(year: number): Promise<ReportData> {
    return apiFetch(`/api/reports?year=${year}`)
  },
}
