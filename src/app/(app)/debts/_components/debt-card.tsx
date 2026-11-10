'use client'

import Link from 'next/link'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { type Debt } from '@/lib/api/debts'
import { formatVND } from '@/lib/utils/currency'
import { DebtAvatar, DebtBadges, DebtDueDate, describeDebt } from './debt-presentation'

/** One debt on the list: who, how much is left, and what can be done with it. */
export function DebtCard({
  debt,
  onEdit,
  onDelete,
  onPay,
  onAddMore,
}: {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
  onAddMore: () => void
}) {
  const { isLend, isCompleted, isOverdue, paidAmount, pct, barColor } = describeDebt(debt)

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 transition-shadow hover:shadow-md ${isCompleted ? 'border-hairline opacity-70' : 'border-hairline'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/debts/${debt.id}`} className="flex items-center gap-2.5 min-w-0 group">
          <DebtAvatar name={debt.person_name} isLend={isLend} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:underline underline-offset-2">{debt.person_name}</p>
              <DebtBadges isLend={isLend} isCompleted={isCompleted} />
            </div>
            <div className="flex items-center gap-2">
              {debt.due_date && <DebtDueDate dueDate={debt.due_date} isOverdue={isOverdue} />}
              {debt.wallets && (
                <p className="text-xs text-gray-400">{debt.wallets.name}</p>
              )}
            </div>
          </div>
        </Link>

        <div className="flex gap-0.5 shrink-0">
          {!isCompleted && (
            <>
              <button onClick={onAddMore} title={debt.type === 'lend' ? 'Lend more' : 'Borrow more'}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand-soft transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <button onClick={onPay} title="Record payment"
                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
                </svg>
              </button>
            </>
          )}
          <IconButton label="Edit debt" onClick={onEdit}>{EditIcon}</IconButton>
          <IconButton label="Delete debt" onClick={onDelete} tone="danger">{TrashIcon}</IconButton>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-1.5 tabular-nums">
        <span>Paid {formatVND(paidAmount)}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{formatVND(debt.remaining_amount)} left</span>
      </div>
      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-bar-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right tabular-nums">of {formatVND(debt.amount)}</p>
    </div>
  )
}
