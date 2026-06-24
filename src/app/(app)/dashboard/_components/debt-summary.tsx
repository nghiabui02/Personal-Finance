import { formatVND } from '@/lib/utils/currency'
import Link from 'next/link'

type DebtItem = {
  type: 'lend' | 'borrow'
  remaining_amount: number
  status: string
}

export function DebtSummary({ debts }: { debts: DebtItem[] }) {
  const active = debts.filter(d => d.status === 'active')
  const totalLend = active.filter(d => d.type === 'lend').reduce((s, d) => s + Number(d.remaining_amount), 0)
  const totalBorrow = active.filter(d => d.type === 'borrow').reduce((s, d) => s + Number(d.remaining_amount), 0)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Debts</h2>
        <Link href="/debts" className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Manage →
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400">No active debts</p>
          <Link href="/debts" className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2">
            Add one
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">They owe me</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(totalLend)}
            </span>
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">I owe them</span>
            <span className="text-sm font-semibold tabular-nums text-rose-500 dark:text-rose-400">
              {formatVND(totalBorrow)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
