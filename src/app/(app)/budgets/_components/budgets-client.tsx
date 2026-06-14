'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatVND } from '@/lib/utils/currency'
import { type Budget, budgetsApi } from '@/lib/api/budgets'
import { type Category } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { BudgetModal } from './budget-modal'

interface BudgetsClientProps {
  budgets: Budget[]
  expenseCategories: Category[]
  month: string
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0
  const isOver = budget.spent > budget.amount
  const isWarning = !isOver && pct >= 80

  const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
  const statusColor = isOver
    ? 'text-red-600 dark:text-red-400'
    : isWarning
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-gray-500 dark:text-gray-400'

  const cat = budget.categories
  const remaining = budget.amount - budget.spent

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg"
            style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
          >
            {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{cat?.name?.[0] ?? '?'}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {cat?.name ?? 'Uncategorized'}
            </p>
            <p className={`text-xs ${statusColor}`}>
              {isOver
                ? `Over by ${formatVND(budget.spent - budget.amount)}`
                : `${formatVND(remaining)} left`}
            </p>
          </div>
        </div>

        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 tabular-nums">
        <span>{formatVND(budget.spent)} spent</span>
        <span>{Math.round(pct)}% of {formatVND(budget.amount)}</span>
      </div>
    </div>
  )
}

export default function BudgetsClient({ budgets, expenseCategories, month }: BudgetsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0)
  const overCount = budgets.filter(b => b.spent > b.amount).length
  const existingCategoryIds = budgets.map(b => b.category_id).filter(Boolean) as string[]

  const [y, m] = month.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function navigate(dir: -1 | 1) {
    const d = new Date(y, m - 1 + dir, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.replace(`/budgets?month=${next}`, { scroll: false })
  }

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await budgetsApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Budgets</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Set spending limits by category</p>
        </div>
        <Button onClick={() => { setEditingBudget(null); setModalOpen(true) }} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New budget
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-36 text-center">{monthLabel}</span>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Budgeted', value: totalBudget, color: 'text-gray-900 dark:text-gray-100' },
            { label: 'Spent', value: totalSpent, color: totalSpent > totalBudget ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400' },
            {
              label: overCount > 0 ? `${overCount} over budget` : 'Remaining',
              value: Math.abs(totalBudget - totalSpent),
              color: totalSpent > totalBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
            },
          ].map(item => (
            <div key={item.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
              <p className={`text-sm font-semibold tabular-nums ${item.color}`}>{formatVND(item.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Budget list */}
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No budgets for this month.</p>
          <button onClick={() => { setEditingBudget(null); setModalOpen(true) }} className="mt-2 text-sm text-blue-600 hover:underline">
            Create your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => { setEditingBudget(b); setModalOpen(true) }}
              onDelete={() => setConfirmId(b.id)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <BudgetModal
          key={editingBudget?.id ?? 'new'}
          editing={editingBudget}
          month={month}
          expenseCategories={expenseCategories}
          existingCategoryIds={existingCategoryIds}
          onClose={() => { setModalOpen(false); setEditingBudget(null) }}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete budget?"
          description="This budget will be removed. Your transactions won't be affected."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
