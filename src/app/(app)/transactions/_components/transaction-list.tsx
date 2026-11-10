'use client'

import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { TabGroup } from '@/components/ui/tab-group'
import { type Transaction } from '@/lib/api/transactions'
import { formatWeekdayMonthDay, localYMD, shiftLocalDate } from '@/lib/utils/date'
import { TransactionRow } from './transaction-row'
import { DateGroupHeader } from '@/components/ui/date-group-header'
import { netOf } from '@/lib/utils/totals'

export type Filter = 'all' | 'income' | 'expense'

const PAGE_SIZE = 10

function formatDateHeader(dateStr: string): string {
  const today = localYMD()
  const yesterday = shiftLocalDate(today, -1)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  return formatWeekdayMonthDay(new Date(y, m - 1, d))
}

function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const key = tx.transaction_date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function CategoryChips({
  transactions,
  selected,
  onSelect,
}: {
  transactions: Transaction[]
  selected: string
  onSelect: (id: string) => void
}) {
  const cats = new Map<string, { id: string; name: string; icon: string | null; color: string | null }>()
  for (const tx of transactions) {
    if (tx.categories && !cats.has(tx.categories.id)) {
      cats.set(tx.categories.id, tx.categories as { id: string; name: string; icon: string | null; color: string | null })
    }
  }
  const list = [...cats.values()]
  if (list.length < 2) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect('')}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          selected === ''
            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
            : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        All
      </button>
      {list.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(selected === cat.id ? '' : cat.id)}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected === cat.id
              ? 'text-white border-transparent'
              : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          style={selected === cat.id ? { backgroundColor: cat.color ?? '#374151' } : undefined}
        >
          {cat.icon && <span>{cat.icon}</span>}
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )
}

export function TransactionList({
  transactions,
  filter,
  onFilter,
  onEdit,
  onDelete,
  onAdd,
  selectedIds,
  onToggleSelect,
  onClearSelection,
}: {
  transactions: Transaction[]
  filter: Filter
  onFilter: (f: Filter) => void
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  onAdd: () => void
  /** Null outside selection mode — that is what switches the rows over. */
  selectedIds: ReadonlySet<string> | null
  onToggleSelect: (id: string) => void
  /** Called when a category chip narrows the list: rows ticked under the old
   *  chip would stay selected out of sight. */
  onClearSelection: () => void
}) {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset pagination when filter or category changes (state-adjust-during-render,
  // see react.dev "You Might Not Need an Effect")
  const filterKey = `${filter}::${selectedCategoryId}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    setDisplayCount(PAGE_SIZE)
  }

  const byType = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter)
  const filtered = selectedCategoryId
    ? byType.filter(tx => tx.categories?.id === selectedCategoryId)
    : byType
  const visible  = filtered.slice(0, displayCount)
  const hasMore  = displayCount < filtered.length
  const groups   = groupByDate(visible)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setDisplayCount(prev => prev + PAGE_SIZE) },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="space-y-3 mb-4 shrink-0">
        <TabGroup
          tabs={[
            { key: 'all',     label: 'All'     },
            { key: 'expense', label: 'Expense' },
            { key: 'income',  label: 'Income'  },
          ]}
          value={filter}
          onChange={onFilter}
          className="w-fit"
        />
        <CategoryChips
          transactions={transactions}
          selected={selectedCategoryId}
          onSelect={categoryId => { setSelectedCategoryId(categoryId); onClearSelection() }}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <EmptyState
            message={filter === 'all' && !selectedCategoryId ? 'No transactions.' : 'No transactions match this filter.'}
            action={filter === 'all' && !selectedCategoryId ? { label: 'Add one', onClick: onAdd } : undefined}
          />
        ) : (
          <div className="space-y-4">
            {groups.map(([date, txs], groupIdx) => (
              <div key={date} className="animate-fade-up" style={{ animationDelay: `${groupIdx * 40}ms` }}>
                <DateGroupHeader label={formatDateHeader(date)} net={netOf(txs)} />

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline divide-y divide-hairline">
                  {txs.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      selection={selectedIds
                        ? { selected: selectedIds.has(tx.id), onToggle: onToggleSelect }
                        : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="py-3 text-center text-xs text-gray-400">
                Loading more...
              </div>
            )}
            {!hasMore && filtered.length > PAGE_SIZE && (
              <p className="py-3 text-center text-xs text-gray-400">
                All {filtered.length} transactions shown
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
