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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budget</h2>
        <Link href="/budgets" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Manage →
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400">No budgets set</p>
          <Link href="/budgets" className="mt-1 text-xs text-blue-600 hover:underline">
            Create a budget
          </Link>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {budgets.map((b, idx) => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const isOver = b.spent > b.amount
            const barColor = isOver
              ? 'bg-rose-500'
              : pct >= 80
              ? 'bg-amber-400'
              : 'bg-blue-500'

            return (
              <li key={b.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{b.category?.icon ?? '📦'}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {b.category?.name ?? 'Unknown'}
                    </span>
                  </div>
                  <span className={`text-xs tabular-nums shrink-0 ml-2 ${isOver ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-gray-400'}`}>
                    {formatVND(b.spent)} / {formatVND(b.amount)}
                  </span>
                </div>
                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-bar-fill ${barColor}`}
                    style={{ width: `${pct}%`, animationDelay: `${idx * 60 + 80}ms` }}
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
