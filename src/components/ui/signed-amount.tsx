import { formatSignedVND } from '@/lib/utils/currency'

/** An amount with its sign, green when it came in and red when it went out. */
export function SignedAmount({
  amount,
  positive,
  className = '',
}: {
  amount: number
  positive: boolean
  className?: string
}) {
  return (
    <span className={`font-semibold tabular-nums ${
      positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    } ${className}`}>
      {formatSignedVND(amount, positive)}
    </span>
  )
}
