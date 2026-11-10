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
  label: string
  totalIncome: number
  totalExpense: number
  categories: { name: string; amount: number }[]
}
