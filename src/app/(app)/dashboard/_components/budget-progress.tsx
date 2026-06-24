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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Budget</h2>
        <Link href="/budgets" className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Manage →
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400">No budgets set</p>
          <Link href="/budgets" className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2">
            Create a budget
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {budgets.map((b, idx) => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const isOver = b.spent > b.amount
            const barColor = isOver ? '#ef4444' : pct >= 80 ? '#f59e0b' : (b.category?.color ?? '#6366f1')

            return (
              <li key={b.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{b.category?.icon ?? '📦'}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {b.category?.name ?? 'Unknown'}
                    </span>
                  </div>
                  <span className={`text-[11px] tabular-nums shrink-0 ml-2 ${isOver ? 'text-rose-500 dark:text-rose-400 font-semibold' : 'text-gray-400'}`}>
                    {formatVND(b.spent)}<span className="text-gray-300 dark:text-gray-600"> / {formatVND(b.amount)}</span>
                  </span>
                </div>
                <div className="h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full animate-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: barColor, animationDelay: `${idx * 60 + 80}ms` }}
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
