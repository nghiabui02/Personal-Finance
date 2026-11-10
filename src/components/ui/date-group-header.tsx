import { formatVND } from '@/lib/utils/currency'

/** The line above a day's transactions: the day, and what it came to. */
export function DateGroupHeader({ label, net }: { label: string; net: number }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className={`text-xs tabular-nums font-medium ${
        net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}>
        {formatVND(net)}
      </p>
    </div>
  )
}
