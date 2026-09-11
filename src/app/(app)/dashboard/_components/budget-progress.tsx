import { formatVND } from '@/lib/utils/currency'
import { BRAND_HEX, MONEY_OUT, WARNING } from '@/lib/utils/colors'
import { SectionCard, SectionEmpty } from '@/components/ui/section-card'

type BudgetItem = {
  id: string
  amount: number
  spent: number
  category: { id: string; name: string; icon: string | null; color: string | null } | null
}

export function BudgetProgress({ budgets }: { budgets: BudgetItem[] }) {
  return (
    <SectionCard title="Budgets" action={{ label: 'Manage', href: '/budgets' }}>
      {budgets.length === 0 ? (
        <SectionEmpty message="No budgets set" action={{ label: 'Create a budget', href: '/budgets' }} />
      ) : (
        <ul className="space-y-3.5">
          {budgets.map((b, idx) => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0
            const isOver = b.spent > b.amount
            const barColor = isOver ? MONEY_OUT : pct >= 80 ? WARNING : (b.category?.color ?? BRAND_HEX)

            return (
              <li key={b.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    {b.category?.icon && <span className="text-sm leading-none shrink-0">{b.category.icon}</span>}
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">
                      {b.category?.name ?? 'Uncategorized'}
                    </span>
                  </div>
                  <span className="text-[11px] tabular-nums shrink-0">
                    <span className={isOver ? 'text-rose-500 dark:text-rose-400 font-semibold' : 'text-gray-600 dark:text-gray-300 font-medium'}>
                      {formatVND(b.spent)}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600"> / {formatVND(b.amount)}</span>
                  </span>
                </div>
                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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
    </SectionCard>
  )
}
