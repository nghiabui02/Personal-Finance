import { formatVND } from '@/lib/utils/currency'
import Link from 'next/link'

type BudgetItem = {
  id: string
  amount: number
  spent: number
  category: { id: string; name: string; icon: string | null; color: string | null } | null
}

export function BudgetProgress({ budgets }: { budgets: BudgetItem[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budget</h2>
        <Link href="/budgets" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Manage
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">No budgets set for this month</p>
          <Link href="/budgets" className="mt-1 text-xs text-blue-600 hover:underline">
            Create a budget
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {budgets.map(b => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const isOver = b.spent > b.amount
            const barColor = isOver
              ? 'bg-red-500'
              : pct >= 80
              ? 'bg-yellow-500'
              : 'bg-blue-500'

            return (
              <li key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{b.category?.icon ?? '📦'}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {b.category?.name ?? 'Unknown'}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formatVND(b.spent)} / {formatVND(b.amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
