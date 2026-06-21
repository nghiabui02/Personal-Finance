'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CategorySelect } from '@/components/ui/category-select'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Budget, budgetsApi } from '@/lib/api/budgets'
import { type Category } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface BudgetModalProps {
  editing: Budget | null
  month: string
  expenseCategories: Category[]
  existingCategoryIds: string[]
  onClose: () => void
}

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function navigate(dir: -1 | 1) {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const [y, m] = value.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</p>
      <div className="flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <button type="button" onClick={() => navigate(1)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function BudgetModal({ editing, month, expenseCategories, existingCategoryIds, onClose }: BudgetModalProps) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(
    editing ? editing.month.slice(0, 7) : month
  )
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')

  const editingCategoryId = editing?.category_id
  const excludedIds = existingCategoryIds.filter(id => id !== editingCategoryId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const amount = Number((e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value)
    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }

    setError(null)
    startTransition(async () => {
      try {
        if (editing) {
          await budgetsApi.update(editing.id, amount)
        } else {
          await budgetsApi.create({
            category_id: categoryId || undefined,
            amount,
            month: `${selectedMonth}-01`,
          })
        }
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={editing ? 'Edit budget' : 'New budget'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />}

        {!editing && (
          <CategorySelect
            categories={expenseCategories}
            excludeIds={excludedIds}
            value={categoryId}
            onChange={setCategoryId}
            searchable
          />
        )}

        {editing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            {editing.categories?.icon && <span className="text-xl">{editing.categories.icon}</span>}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {editing.categories?.name ?? 'Uncategorized'}
            </span>
          </div>
        )}

        <AmountInput label="Budget amount" name="amount" defaultValue={editing?.amount} required />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
