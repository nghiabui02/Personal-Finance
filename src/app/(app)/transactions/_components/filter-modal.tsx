'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { Modal, useModalClose } from '@/components/ui/modal'
import { TabGroup } from '@/components/ui/tab-group'
import { type Category } from '@/lib/api/categories'
import { type Wallet } from '@/lib/api/wallets'
import type { TransactionFilters } from '@/lib/server/transaction-filters'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

/** Filters live in the URL, so a narrowed list is shareable and survives reload. */
const FILTER_PARAMS = ['type', 'cat', 'wallet', 'min', 'max'] as const

function buildFilterUrl(current: URLSearchParams, filters: TransactionFilters): string {
  const next = new URLSearchParams(current)
  for (const key of FILTER_PARAMS) next.delete(key)

  if (filters.type) next.set('type', filters.type)
  if (filters.categoryId) next.set('cat', filters.categoryId)
  if (filters.walletId) next.set('wallet', filters.walletId)
  if (filters.min !== undefined) next.set('min', String(filters.min))
  if (filters.max !== undefined) next.set('max', String(filters.max))

  const query = next.toString()
  return query ? `/transactions?${query}` : '/transactions'
}

export function FilterModal({
  filters,
  categories,
  wallets,
  onClose,
}: {
  filters: TransactionFilters
  categories: Category[]
  wallets: Wallet[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [type, setType] = useState<'all' | 'income' | 'expense'>(filters.type ?? 'all')
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? '')
  const [walletId, setWalletId] = useState(filters.walletId ?? '')
  const [min, setMin] = useState<number | undefined>(filters.min)
  const [max, setMax] = useState<number | undefined>(filters.max)

  // Only categories of the chosen direction can match, so hide the rest.
  const selectableCategories = type === 'all' ? categories : categories.filter(c => c.type === type)

  const categoryOptions = [
    { value: '', label: 'Any category' },
    ...selectableCategories.map(c => ({ value: c.id, label: `${c.icon ?? ''} ${c.name}`.trim() })),
  ]
  const walletOptions = [
    { value: '', label: 'Any wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color ?? undefined })),
  ]

  function apply() {
    router.push(buildFilterUrl(new URLSearchParams(searchParams.toString()), {
      type: type === 'all' ? undefined : type,
      categoryId: categoryId || undefined,
      walletId: walletId || undefined,
      min: min && min > 0 ? min : undefined,
      max: max && max > 0 ? max : undefined,
    }))
    onClose()
  }

  function clearAll() {
    router.push(buildFilterUrl(new URLSearchParams(searchParams.toString()), {}))
    onClose()
  }

  return (
    <Modal title="Filter transactions" size="md" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction</p>
          <TabGroup
            tabs={[
              { key: 'all', label: 'All' },
              { key: 'expense', label: 'Expense' },
              { key: 'income', label: 'Income' },
            ]}
            value={type}
            onChange={t => { setType(t); setCategoryId('') }}
          />
        </div>

        <CustomSelect
          label="Category"
          name="cat"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          searchable
        />

        <CustomSelect
          label="Wallet"
          name="wallet"
          options={walletOptions}
          value={walletId}
          onChange={setWalletId}
        />

        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="From" name="min" defaultValue={filters.min} onValueChange={setMin} placeholder="0" />
          <AmountInput label="To" name="max" defaultValue={filters.max} onValueChange={setMax} placeholder="Any" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={clearAll} className="flex-1">Clear all</Button>
          <Button type="button" onClick={apply} className="flex-1">Apply</Button>
        </div>

        <button type="button" onClick={close} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </Modal>
  )
}
