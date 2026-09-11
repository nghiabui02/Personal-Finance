import { formatVND } from '@/lib/utils/currency'
import { SectionCard, SectionEmpty } from './section-card'

type DebtItem = {
  type: 'lend' | 'borrow'
  remaining_amount: number
  status: string
}

export function DebtSummary({ debts }: { debts: DebtItem[] }) {
  const active = debts.filter(d => d.status === 'active')
  const totalLend = active.filter(d => d.type === 'lend').reduce((s, d) => s + Number(d.remaining_amount), 0)
  const totalBorrow = active.filter(d => d.type === 'borrow').reduce((s, d) => s + Number(d.remaining_amount), 0)

  const net = totalLend - totalBorrow

  return (
    <SectionCard title="Debts" action={{ label: 'Manage', href: '/debts' }}>
      {active.length === 0 ? (
        <SectionEmpty message="No active debts" action={{ label: 'Track a debt', href: '/debts' }} />
      ) : (
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-gray-400 dark:text-gray-500">They owe me</dt>
            <dd className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(totalLend)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-gray-400 dark:text-gray-500">I owe them</dt>
            <dd className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
              {formatVND(totalBorrow)}
            </dd>
          </div>
          {/* The figure that actually answers "am I up or down on debt" */}
          <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-hairline dark:border-gray-800">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Net position</dt>
            <dd className={`text-sm font-semibold tabular-nums ${
              net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}>
              {net >= 0 ? '+' : '−'}{formatVND(Math.abs(net))}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  )
}
