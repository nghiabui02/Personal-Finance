'use client'

import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/toast'
import { BRAND_HEX, MONEY_OUT, WARNING } from '@/lib/utils/colors'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { PeriodNav } from '@/components/ui/period-nav'
import { REPORT_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { TabGroup } from '@/components/ui/tab-group'
import { formatVND } from '@/lib/utils/currency'
import { type Budget, budgetsApi } from '@/lib/api/budgets'
import { type Category } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { BudgetModal } from './budget-modal'
import { SuggestBudgetsModal } from './suggest-budgets-modal'
import type { BudgetSuggestion } from '@/lib/server/budget-suggestions'

interface BudgetsClientProps {
  budgets: Budget[]
  /** Categories worth budgeting that have no budget yet this month. */
  suggestions: BudgetSuggestion[]
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
  const limit = budget.effectiveAmount
  const pct = limit > 0 ? Math.min((budget.spent / limit) * 100, 100) : 0
  const isOver = budget.spent > limit
  const isWarning = !isOver && pct >= 80

  const barColor = isOver
    ? MONEY_OUT
    : isWarning
    ? WARNING
    : (budget.categories?.color ?? BRAND_HEX)

  const statusColor = isOver
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-400 dark:text-gray-500'

  const cat = budget.categories
  const remaining = limit - budget.spent

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline p-4">
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
                {budget.rolloverCarry > 0
                  ? `+${formatVND(budget.rolloverCarry)} carried from last month`
                  : `−${formatVND(-budget.rolloverCarry)} overspend carried over`}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 shrink-0">
          <IconButton label="Edit budget" onClick={onEdit}>{EditIcon}</IconButton>
          <IconButton label="Delete budget" onClick={onDelete} tone="danger">{TrashIcon}</IconButton>
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

export default function BudgetsClient({ budgets, suggestions, expenseCategories, month }: BudgetsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'inactive'>('active')
  const [suggestOpen, setSuggestOpen] = useState(false)

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
      catch (err) { toastError(err, 'Could not delete the budget.') }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <ScreenHeader
        eyebrow={monthLabel}
        headline={
          activeBudgets.length === 0
            ? <>No budgets set for this month — add one to give your spending a ceiling.</>
            : overCount > 0
            ? <><Em tone="bad">{overCount} of {activeBudgets.length}</Em> budget{overCount === 1 ? ' is' : 's are'} over the limit.</>
            : totalBudget > 0 && spentPct >= 80
            ? <>You&rsquo;ve used <Em tone="warn">{Math.round(spentPct)}%</Em> of what you budgeted this month.</>
            : <>All <Em tone="good">{activeBudgets.length}</Em> budget{activeBudgets.length === 1 ? ' is' : 's are'} on track.</>
        }
        support={activeBudgets.length > 0
          ? <>
              <span>{formatVND(totalSpent)} of {formatVND(totalBudget)}</span><Dot />
              <span>
                {totalSpent > totalBudget
                  ? `${formatVND(totalSpent - totalBudget)} over`
                  : `${formatVND(totalBudget - totalSpent)} left`}
              </span>
            </>
          : undefined}
        segments={REPORT_SEGMENTS}
        controls={
          <PeriodNav label={monthLabel} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        }
        action={
          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <Button variant="secondary" onClick={() => setSuggestOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
                <span className="hidden sm:inline">Suggest</span>
              </Button>
            )}
          <Button onClick={() => { setEditingBudget(null); setModalOpen(true) }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New budget
          </Button>
          </div>
        }
      />

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

      {visibleBudgets.length === 0 ? (
        <EmptyState
          message={tab === 'active' ? 'No budgets for this month.' : 'No inactive budgets.'}
          action={
            tab !== 'active' ? undefined
            : suggestions.length > 0
              // With history to draw on, picking numbers is the hard part — lead
              // with the suggestion rather than an empty form.
              ? { label: 'Suggest budgets from the last 3 months', onClick: () => setSuggestOpen(true) }
              : { label: 'Create your first budget', onClick: () => { setEditingBudget(null); setModalOpen(true) } }
          }
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

      {suggestOpen && (
        <SuggestBudgetsModal
          suggestions={suggestions}
          month={month}
          onClose={() => setSuggestOpen(false)}
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
