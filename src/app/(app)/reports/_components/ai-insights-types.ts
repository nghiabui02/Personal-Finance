export interface Insight {
  emoji: string
  text: string
  type: 'tip' | 'warning' | 'good'
}

export interface Analysis {
  summary: string
  topSpend?: string
  assets?: string
  insights: Insight[]
  score: number
}

export type PreviousPeriod = {
  period: string
  start: string
  label: string
  totalIncome: number
  totalExpense: number
  categories: { id: string; name: string; amount: number }[]
}
