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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
        <Link href="/transactions" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          View all
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">No transactions yet</p>
          <Link href="/transactions" className="mt-1 text-xs text-blue-600 hover:underline">
            Add your first one
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {transactions.map(tx => {
            const cat = tx.categories
            return (
              <li key={tx.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
                >
                  {cat?.icon ?? (
                    <span className="text-xs font-semibold text-gray-400">
                      {cat?.name?.[0] ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {tx.note || cat?.name || 'Uncategorized'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(tx.transaction_date)}</p>
                </div>
                <span className={`text-sm font-medium tabular-nums shrink-0 ${
                  tx.type === 'income'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
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
