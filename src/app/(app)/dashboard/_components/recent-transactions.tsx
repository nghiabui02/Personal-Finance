import { formatVND } from '@/lib/utils/currency'
import { SectionCard, SectionEmpty } from '@/components/ui/section-card'

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
    <SectionCard
      title="Recent activity"
      action={{ label: 'View all', href: '/transactions' }}
      className="flex flex-col flex-1"
    >
      {transactions.length === 0 ? (
        <SectionEmpty message="Nothing recorded yet" action={{ label: 'Add your first transaction', href: '/transactions' }} />
      ) : (
        <ul className="space-y-2.5">
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
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium leading-snug">
                    {tx.note || cat?.name || 'Uncategorized'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug mt-0.5">
                    {formatDate(tx.transaction_date)}
                    {tx.note && cat?.name ? ` · ${cat.name}` : ''}
                  </p>
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
    </SectionCard>
  )
}
