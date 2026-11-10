'use client'

import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import { formatVND } from '@/lib/utils/currency'
import { keepFocus } from './centered-amount-input'

/** One-tap repeats — the same spend logged the same way before. */
export function FrequentChips({
  frequent,
  activeKey,
  onPick,
}: {
  frequent: FrequentTransaction[]
  /** The chip last picked, shown as selected. */
  activeKey: string | undefined
  onPick: (f: FrequentTransaction) => void
}) {
  return (
    <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 w-max">
        {frequent.map(f => {
          const active = activeKey === f.key
          return (
            <button
              key={f.key}
              type="button"
              onMouseDown={keepFocus}
              onClick={() => onPick(f)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                active
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-hairline bg-gray-50 text-gray-600 hover:border-gray-300 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="leading-none">{f.categoryIcon ?? '🏷️'}</span>
              <span className="font-medium">{f.categoryName}</span>
              <span className="tabular-nums opacity-70">{formatVND(f.amount)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
