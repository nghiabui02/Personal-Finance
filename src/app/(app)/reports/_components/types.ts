import type { CategoryRef } from '@/lib/types'

export type ChartPoint = {
  label: string
  income: number
  expense: number
}

export type CategoryData = CategoryRef & {
  amount: number
}
