'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodNav } from '@/components/ui/period-nav'
import { TabGroup } from '@/components/ui/tab-group'
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

const PENCIL = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
  </svg>
)
const TRASH = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget
  onEdit: () => void
  onDelete: () => void
}) {
  const limit = budget.effectiveAmount
  const pct = limit > 0 ? Math.min((budget.spent / limit) * 100, 100) : 0
  const isOver = budget.spent > limit
  const isWarning = !isOver && pct >= 80

  const barColor = isOver
    ? '#f43f5e'
    : isWarning
    ? '#f59e0b'
    : (budget.categories?.color ?? '#6366f1')

  const statusColor = isOver
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-400 dark:text-gray-500'

  const cat = budget.categories
  const remaining = limit - budget.spent

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
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
                ? `Over by ${formatVND(budget.spent - limit)}`
                : `${formatVND(remaining)} left`}
            </p>
            {budget.rollover && budget.rolloverCarry !== 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {budget.rolloverCarry > 0 ? '+' : '−'}{formatVND(Math.abs(budget.rolloverCarry))} rollover
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{PENCIL}</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">{TRASH}</button>
        </div>
      </div>

      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full animate-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 tabular-nums">
        <span>{formatVND(budget.spent)} spent</span>
        <span>{Math.round(pct)}% of {formatVND(limit)}</span>
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
  const [tab, setTab] = useState<'active' | 'inactive'>('active')

  const activeBudgets = budgets.filter(b => b.active)
  const inactiveBudgets = budgets.filter(b => !b.active)
  const visibleBudgets = tab === 'active' ? activeBudgets : inactiveBudgets

  const totalBudget = activeBudgets.reduce((s, b) => s + Number(b.effectiveAmount), 0)
  const totalSpent = activeBudgets.reduce((s, b) => s + Number(b.spent), 0)
  const overCount = activeBudgets.filter(b => b.spent > b.effectiveAmount).length
  const existingCategoryIds = budgets.map(b => b.category_id).filter(Boolean) as string[]
  const spentPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0

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
      <div className="flex items-center justify-between gap-3 mb-5">
        <PeriodNav
          label={monthLabel}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
        />
        <Button onClick={() => { setEditingBudget(null); setModalOpen(true) }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New budget
        </Button>
      </div>

      {inactiveBudgets.length > 0 && (
        <TabGroup
          tabs={[
            { key: 'active', label: `Active (${activeBudgets.length})` },
            { key: 'inactive', label: `Inactive (${inactiveBudgets.length})` },
          ]}
          value={tab}
          onChange={setTab}
          className="w-fit mb-5"
        />
      )}

      {/* Hero panel */}
      {tab === 'active' && activeBudgets.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 mb-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Budget Overview
            </p>
            {overCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                {overCount} over budget
              </span>
            )}
          </div>

          <p className={`text-[2.5rem] font-bold tabular-nums tracking-tight leading-none ${
            totalSpent > totalBudget ? 'text-rose-400' : 'text-white'
          }`}>
            {formatVND(totalSpent)}
          </p>
          <p className="text-sm text-slate-500 mt-1">of {formatVND(totalBudget)} budgeted</p>

          {totalBudget > 0 && (
            <div className="mt-4">
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full animate-bar-fill ${totalSpent > totalBudget ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-[10px] text-slate-600">{Math.round(spentPct)}% spent</p>
                <p className="text-[10px] text-slate-600">
                  {totalSpent > totalBudget
                    ? `${formatVND(totalSpent - totalBudget)} over`
                    : `${formatVND(totalBudget - totalSpent)} left`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {visibleBudgets.length === 0 ? (
        <EmptyState
          message={tab === 'active' ? 'No budgets for this month.' : 'No inactive budgets.'}
          action={tab === 'active' ? { label: 'Create your first budget', onClick: () => { setEditingBudget(null); setModalOpen(true) } } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleBudgets.map((b, idx) => (
            <div key={b.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <BudgetCard
                budget={b}
                onEdit={() => { setEditingBudget(b); setModalOpen(true) }}
                onDelete={() => setConfirmId(b.id)}
              />
            </div>
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
