import { type Debt } from '@/lib/api/debts'
import { BRAND_HEX, MONEY_IN } from '@/lib/utils/colors'
import { formatMonthDayYear } from '@/lib/utils/date'

/**
 * How a debt looks, shared by the card on the list and the header of its own
 * page. Lent and borrowed money get one colour each, so the two never read as
 * the same thing at a glance.
 */

export const BORROWED_HEX = '#f97316'

/** What both screens work out from a debt before drawing it. */
export function describeDebt(debt: Debt) {
  const isCompleted = debt.status === 'completed'
  const isLend = debt.type === 'lend'
  const paidAmount = debt.amount - debt.remaining_amount
  return {
    isLend,
    isCompleted,
    isOverdue: !!debt.due_date && !isCompleted && new Date(debt.due_date) < new Date(),
    paidAmount,
    pct: debt.amount > 0 ? Math.min((paidAmount / debt.amount) * 100, 100) : 0,
    barColor: isCompleted ? MONEY_IN : isLend ? BRAND_HEX : BORROWED_HEX,
  }
}

const AVATAR_SIZES = {
  sm: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-lg',
} as const

/** The person's first letter on a disc coloured by direction. */
export function DebtAvatar({ name, isLend, size }: { name: string; isLend: boolean; size: keyof typeof AVATAR_SIZES }) {
  return (
    <div className={`${AVATAR_SIZES[size]} rounded-full flex items-center justify-center font-bold shrink-0 ${
      isLend
        ? 'bg-brand-soft text-brand'
        : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
    }`}>
      {name[0].toUpperCase()}
    </div>
  )
}

/** "Lent" or "Borrowed", and "Done" once it is settled. */
export function DebtBadges({ isLend, isCompleted }: { isLend: boolean; isCompleted: boolean }) {
  return (
    <>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
        isLend
          ? 'bg-brand-soft text-brand'
          : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
      }`}>
        {isLend ? 'Lent' : 'Borrowed'}
      </span>
      {isCompleted && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">Done</span>
      )}
    </>
  )
}

export function DebtDueDate({ dueDate, isOverdue }: { dueDate: string; isOverdue: boolean }) {
  return (
    <p className={`text-xs ${isOverdue ? 'text-rose-500' : 'text-gray-400'}`}>
      Due {formatMonthDayYear(new Date(dueDate))}
      {isOverdue && ' · Overdue'}
    </p>
  )
}
