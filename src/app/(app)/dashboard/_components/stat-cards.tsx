import { formatVND } from '@/lib/utils/currency'

interface StatCardsProps {
  totalIncome: number
  totalExpense: number
  balance: number
}

export function StatCards({ totalIncome, totalExpense, balance }: StatCardsProps) {
  const net = totalIncome - totalExpense
  const cards = [
    {
      label: 'Income',
      value: totalIncome,
      bg: 'bg-green-50 dark:bg-green-950/30',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Expense',
      value: totalExpense,
      bg: 'bg-red-50 dark:bg-red-950/30',
      color: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Balance',
      value: net,
      bg: 'bg-white dark:bg-gray-900',
      color: net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map(card => (
        <div
          key={card.label}
          className={`${card.bg} rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{card.label}</p>
          <p className={`text-xs font-semibold tabular-nums truncate ${card.color}`}>
            {formatVND(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
