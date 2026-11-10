'use client'

import { Button } from '@/components/ui/button'
import { CategorySelect } from '@/components/ui/category-select'
import { type Category } from '@/lib/api/categories'
import { isStandalone, type Transaction } from '@/lib/api/transactions'
import { MAX_BULK_TRANSACTIONS } from '@/lib/constants'

/**
 * The actions a selection can take, pinned above the mobile nav the way the
 * toasts are. Choosing a category applies it straight away: it is one control
 * instead of a picker plus a confirm. Each row's previous category is not
 * kept, so the way back is selecting the rows again.
 *
 * System categories are left out: rows filed under one drop out of income,
 * spending and budgets, which is too much for a mis-tap to do to a whole batch.
 * The single-transaction form still offers them.
 */
export function SelectionBar({
  selected,
  categories,
  isPending,
  onCategorize,
  onDelete,
  onCancel,
}: {
  selected: Transaction[]
  categories: Category[]
  isPending: boolean
  onCategorize: (categoryId: string) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const types = new Set(selected.map(tx => tx.type))
  const overLimit = selected.length > MAX_BULK_TRANSACTIONS
  const categorizable = selected.length > 0 && types.size === 1 && selected.every(isStandalone)
  const [type] = [...types]

  return (
    <div
      data-selection-bar
      className="fixed left-1/2 -translate-x-1/2 z-[200] w-[min(32rem,calc(100vw-2rem))] bottom-above-nav md:bottom-5"
    >
      <div className="rounded-2xl border border-hairline bg-white dark:bg-gray-900 shadow-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium flex-1">
            {selected.length} selected
          </p>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button variant="danger" onClick={onDelete} disabled={isPending || overLimit || selected.length === 0}>
            Delete
          </Button>
        </div>
        {overLimit ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            A batch is {MAX_BULK_TRANSACTIONS} transactions at most. Untick some to continue.
          </p>
        ) : categorizable ? (
          <CategorySelect
            label=""
            categories={categories.filter(category => !category.system_key)}
            filterType={type}
            value=""
            // A second pick while the first is still saving would send both.
            onChange={categoryId => { if (categoryId && !isPending) onCategorize(categoryId) }}
            placeholder="Move all to category…"
            searchable
          />
        ) : selected.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mixing income with expense, a transfer or a debt repayment leaves only Delete:
            those carry a category their own record decides.
          </p>
        )}
      </div>
    </div>
  )
}
