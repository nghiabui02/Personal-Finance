import { formatVND } from '@/lib/utils/currency'
import Link from 'next/link'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string | null
  transaction_date: string
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Recent Transactions</h2>
        <Link href="/transactions" className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">No transactions yet</p>
          <Link href="/transactions" className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2">
            Add your first one
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {transactions.map((tx, idx) => {
            const cat = tx.categories
            return (
              <li key={tx.id} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: cat?.color ? `${cat.color}18` : '#f3f4f6' }}
                >
                  {cat?.icon ?? (
                    <span className="text-xs font-semibold text-gray-400">
                      {cat?.name?.[0] ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                    {tx.note || cat?.name || 'Uncategorized'}
                  </p>
                  <p className="text-[10px] text-gray-400">{formatDate(tx.transaction_date)}</p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                  tx.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
