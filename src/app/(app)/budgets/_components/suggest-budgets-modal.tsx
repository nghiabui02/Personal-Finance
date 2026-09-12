'use client'

import { Button } from '@/components/ui/button'
import { Modal, useModalClose } from '@/components/ui/modal'
import { toast, toastError } from '@/components/ui/toast'
import { budgetsApi } from '@/lib/api/budgets'
import { formatVND } from '@/lib/utils/currency'
import { monthRange } from '@/lib/utils/date'
import type { BudgetSuggestion } from '@/lib/server/budget-suggestions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Review the proposed budgets before they exist. Each row can be dropped; the
 * amounts are editable afterwards on the cards themselves, so this stays a
 * confirmation rather than another form.
 */
export function SuggestBudgetsModal({
  suggestions,
  month,
  onClose,
}: {
  suggestions: BudgetSuggestion[]
  month: string
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const chosen = suggestions.filter(s => !skipped.has(s.categoryId))
  const total = chosen.reduce((sum, s) => sum + s.amount, 0)

  function toggle(categoryId: string) {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function handleCreate() {
    if (chosen.length === 0) return
    startTransition(async () => {
      try {
        // Sequential, not parallel: budgets are unique per (category, month) and
        // a partial failure should stop rather than race.
        for (const s of chosen) {
          await budgetsApi.create({
            category_id: s.categoryId,
            amount: s.amount,
            month: monthRange(month).startDate,
          })
        }
        toast.success(`Created ${chosen.length} budget${chosen.length === 1 ? '' : 's'}. Edit any of them anytime.`)
        router.refresh()
        onClose()
      } catch (err) {
        toastError(err, 'Could not create the budgets.')
      }
    })
  }

  return (
    <Modal title="Suggested budgets" size="md" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Median of what you actually spent in each category over the last 3 months,
          rounded. Nothing is created until you confirm.
        </p>

        <ul className="divide-y divide-hairline rounded-xl border border-hairline overflow-hidden">
          {suggestions.map(s => {
            const isSkipped = skipped.has(s.categoryId)
            return (
              <li key={s.categoryId}>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={!isSkipped}
                    onChange={() => toggle(s.categoryId)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-fill focus:ring-brand shrink-0"
                  />
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ backgroundColor: s.category.color ? `${s.category.color}22` : '#f3f4f6' }}
                  >
                    {s.category.icon ?? '🏷️'}
                  </span>
                  <span className={`flex-1 min-w-0 ${isSkipped ? 'opacity-40' : ''}`}>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {s.category.name}
                    </span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500">
                      from {s.monthsObserved} month{s.monthsObserved === 1 ? '' : 's'} of spending
                    </span>
                  </span>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${isSkipped ? 'opacity-40 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                    {formatVND(s.amount)}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {chosen.length} budget{chosen.length === 1 ? '' : 's'}
          </span>
          <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatVND(total)} total
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button type="button" onClick={handleCreate} disabled={isPending || chosen.length === 0} className="flex-1">
            {isPending ? 'Creating…' : `Create ${chosen.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
