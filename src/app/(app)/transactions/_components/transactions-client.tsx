'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast, toastError } from '@/components/ui/toast'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { CategorySelect } from '@/components/ui/category-select'
import { EmptyState } from '@/components/ui/empty-state'
import { Dot, Em, Verdict } from '@/components/ui/verdict'
import { TabGroup } from '@/components/ui/tab-group'
import { formatVND } from '@/lib/utils/currency'
import { type Category } from '@/lib/api/categories'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { localYMD, shiftLocalDate } from '@/lib/utils/date'
import type { DebtOption } from '@/lib/types'
import { TransactionModal } from './transaction-modal'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import type { HistoryTransaction } from '@/lib/transaction-matching'
import { MAX_BULK_TRANSACTIONS } from '@/lib/constants'
import { countActiveFilters, type TransactionFilters } from '@/lib/server/transaction-filters'
import { FilterModal } from './filter-modal'
import { PeriodNavigator, ViewSelector, type ViewMode } from './period-navigator'
import { TransactionCalendar } from './transaction-calendar'

type Filter = 'all' | 'income' | 'expense'

function formatDateHeader(dateStr: string): string {
  const today = localYMD()
  const yesterday = shiftLocalDate(today, -1)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
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

/**
 * A transfer leg and a debt repayment are owned by the record they belong to:
 * their direction and category follow it, and re-creating one from a list
 * would leave that record pointing at nothing. They can still be deleted —
 * the database function reverses the whole relationship — but not restored
 * from here, and not recategorised in bulk.
 */
function isStandalone(tx: Transaction): boolean {
  return !tx.transfer_pair_id && !tx.debt_payment_id
}

interface TransactionsClientProps {
  transactions: Transaction[]
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  frequent: FrequentTransaction[]
  recent: HistoryTransaction[]
  view: ViewMode
  period: string
  searchQuery?: string
  filters: TransactionFilters
}

const PAGE_SIZE = 10

const PLUS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)


/** Present only while the list is in selection mode. */
interface RowSelection {
  selected: boolean
  onToggle: (id: string) => void
}

function TransactionRow({
  tx,
  onEdit,
  onDelete,
  selection,
}: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  selection?: RowSelection
}) {
  const cat = tx.categories

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        selection ? 'cursor-pointer' : ''
      } ${selection?.selected ? 'bg-brand-soft' : ''}`}
      onClick={selection ? () => selection.onToggle(tx.id) : undefined}
    >
      {selection && (
        <input
          type="checkbox"
          checked={selection.selected}
          onChange={() => selection.onToggle(tx.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select ${tx.note || cat?.name || 'transaction'}`}
          className="shrink-0 accent-[var(--brand)]"
        />
      )}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
        style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
      >
        {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{cat?.name?.[0] ?? '?'}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {tx.note || cat?.name || 'Uncategorized'}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {cat?.name && tx.note ? cat.name : tx.wallets?.name ?? ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <span className={`text-sm font-semibold tabular-nums ${
          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
        </span>
        {Number(tx.bank_fee) > 0 && (
          <span className="block text-[10px] text-gray-400 tabular-nums">
            incl. {formatVND(tx.bank_fee!)} fee
          </span>
        )}
      </div>

      {!selection && (
        <div className="flex gap-0.5">
          {!tx.transfer_pair_id && (
            <IconButton label="Edit transaction" onClick={() => onEdit(tx)}>{EditIcon}</IconButton>
          )}
          <IconButton label="Delete transaction" onClick={() => onDelete(tx.id)} tone="danger">{TrashIcon}</IconButton>
        </div>
      )}
    </div>
  )
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

function TransactionList({
  transactions,
  filter,
  onFilter,
  onEdit,
  onDelete,
  onAdd,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  scrollableBody = false,
  hideSummary = false,
}: {
  transactions: Transaction[]
  filter: Filter
  hideSummary?: boolean
  scrollableBody?: boolean
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

  const income  = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0)
  const expense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)
  const net = income - expense

  return (
    <div className={scrollableBody ? 'flex flex-col min-h-0 flex-1' : ''}>
      {!hideSummary && (
        <div className={`grid grid-cols-3 gap-2 mb-4 ${scrollableBody ? 'shrink-0' : ''}`}>
          {[
            { label: 'Income',  value: income,  cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Expense', value: expense, cls: 'text-rose-600 dark:text-rose-400' },
            { label: 'Net',     value: net,     cls: net >= 0 ? 'text-brand' : 'text-rose-600 dark:text-rose-400' },
          ].map(item => (
            <div key={item.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-0.5">{item.label}</p>
              <p className={`text-xs font-semibold tabular-nums ${item.cls}`}>{formatVND(item.value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`space-y-3 mb-4 ${scrollableBody ? 'shrink-0' : ''}`}>
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

      <div className={scrollableBody ? 'flex-1 overflow-y-auto min-h-0' : ''}>
        {filtered.length === 0 ? (
          <EmptyState
            message={filter === 'all' && !selectedCategoryId ? 'No transactions.' : 'No transactions match this filter.'}
            action={filter === 'all' && !selectedCategoryId ? { label: 'Add one', onClick: onAdd } : undefined}
          />
        ) : (
          <div className="space-y-4">
            {groups.map(([date, txs], groupIdx) => (
              <div key={date} className="animate-fade-up" style={{ animationDelay: `${groupIdx * 40}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                    {formatDateHeader(date)}
                  </p>
                  <p className={`text-xs tabular-nums font-medium ${
                    txs.reduce((s, tx) => s + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatVND(txs.reduce((s, tx) => s + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0))}
                  </p>
                </div>

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
function SelectionBar({
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

// ── Main client ───────────────────────────────────────────────────────────────

export default function TransactionsClient({
  transactions,
  categories,
  wallets,
  debts,
  frequent,
  recent,
  view,
  period,
  searchQuery = '',
  filters,
}: TransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const activeFilters = countActiveFilters(filters)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  // Null is "not selecting". An empty Set is selection mode with nothing
  // picked yet, which still has to show the rows' checkboxes.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Search state
  const [searchOpen, setSearchOpen] = useState(!!searchQuery)
  const [searchValue, setSearchValue] = useState(searchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isSearchMode = !!searchQuery

  // Sync from URL changes, e.g. browser back/forward (state-adjust-during-render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery)
    setSearchValue(searchQuery)
    setSearchOpen(!!searchQuery)
  }

  // Rows ticked under one tab, day or period would otherwise stay selected out
  // of sight and still be acted on. Selection mode stays on; the picks go.
  const selectionScope = `${view}::${period}::${searchQuery}::${filter}::${selectedDate ?? ''}`
  const [prevSelectionScope, setPrevSelectionScope] = useState(selectionScope)
  if (prevSelectionScope !== selectionScope) {
    setPrevSelectionScope(selectionScope)
    clearPicks()
  }

  function clearPicks() {
    if (selectedIds?.size) setSelectedIds(new Set())
  }

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  function handleSearch() {
    const q = searchValue.trim()
    if (!q) {
      clearSearch()
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.set('q', q)
    url.searchParams.delete('view')
    url.searchParams.delete('month')
    url.searchParams.delete('week')
    url.searchParams.delete('date')
    router.push(url.pathname + url.search)
  }

  function clearSearch() {
    setSearchValue('')
    setSearchOpen(false)
    // Closing the search box drops the query, not the filters the user set.
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    router.push(url.pathname + url.search)
  }

  const totalIncome  = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0)
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)
  const totalNet = totalIncome - totalExpense
  const biggestExpense = transactions
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0]

  const displayedTransactions = selectedDate
    ? transactions.filter(tx => tx.transaction_date === selectedDate)
    : transactions

  const defaultDate = (() => {
    if (view === 'day') return period
    if (view === 'month' && selectedDate) return selectedDate
    return undefined
  })()

  function openModal(tx: Transaction | null = null) {
    setEditingTx(tx)
    setModalOpen(true)
  }

  const confirmTx = transactions.find(t => t.id === confirmId)
  const deleteConsequence = confirmTx?.debt_payment_id
    ? 'The money goes back to the wallet and the debt is reopened for this amount.'
    : confirmTx?.wallet_id
      ? 'The amount goes back to the wallet it came from.'
      : 'This transaction will be permanently deleted.'

  /** Re-creates a deleted row. A new id, the same money. */
  function restore(tx: Transaction) {
    startTransition(async () => {
      try {
        await transactionsApi.create({
          type: tx.type,
          // Stored `amount` is the total; the server adds the fee back on top
          // of the base it is given, so the fee has to come off first.
          amount: Number(tx.amount) - Number(tx.bank_fee ?? 0),
          category_id: tx.category_id ?? undefined,
          wallet_id: tx.wallet_id ?? undefined,
          transaction_date: tx.transaction_date,
          note: tx.note ?? undefined,
          bank_fee: Number(tx.bank_fee) > 0 ? Number(tx.bank_fee) : undefined,
        })
        router.refresh()
      } catch (err) {
        toastError(err, 'Could not restore the transaction.')
      }
    })
  }

  function deleteTransaction(tx: Transaction) {
    startTransition(async () => {
      try {
        await transactionsApi.delete(tx.id)
        router.refresh()
        toast.success(
          'Transaction deleted.',
          isStandalone(tx) ? { label: 'Undo', onClick: () => restore(tx) } : undefined,
        )
      } catch (err) {
        toastError(err, 'Could not delete the transaction.')
      } finally {
        setConfirmId(null)
      }
    })
  }

  /**
   * A standalone row goes at once, with the way back in the toast — the
   * confirm step bought nothing that Undo does not. A transfer or a debt
   * repayment still asks: reversing one touches a record Undo cannot rebuild.
   */
  function handleDelete(id: string) {
    const tx = transactions.find(t => t.id === id)
    // No modal stands between two taps on the same row any more, and the
    // second delete would only report the row as not found.
    if (!tx || isPending) return
    if (isStandalone(tx)) deleteTransaction(tx)
    else setConfirmId(id)
  }

  function handleDeleteConfirmed() {
    if (confirmTx) deleteTransaction(confirmTx)
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectedTransactions = selectedIds
    ? transactions.filter(tx => selectedIds.has(tx.id))
    : []

  function toggleSelect(id: string) {
    setSelectedIds(current => {
      const next = new Set(current ?? [])
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function endSelection() {
    setSelectedIds(null)
    setConfirmBulkDelete(false)
  }

  /** `action` reports what happened, in the server's own count — not always
   *  the number selected, since deleting a transfer takes its sibling leg. */
  function runOnSelection(action: (ids: string[]) => Promise<string>, fallback: string) {
    const ids = selectedTransactions.map(tx => tx.id)
    startTransition(async () => {
      try {
        const message = await action(ids)
        endSelection()
        router.refresh()
        toast.success(message)
      } catch (err) {
        toastError(err, fallback)
        // A recategorise refused part-way keeps the rows it did change, so the
        // list is reloaded rather than left showing the old categories.
        router.refresh()
      }
    })
  }

  function categorizeSelection(categoryId: string) {
    runOnSelection(
      async ids => `${plural((await transactionsApi.categorizeMany(ids, categoryId)).updated, 'transaction')} moved.`,
      'Could not change the category.',
    )
  }

  function deleteSelection() {
    runOnSelection(
      async ids => `${plural((await transactionsApi.deleteMany(ids)).deleted, 'transaction')} deleted.`,
      'Could not delete the selection.',
    )
  }

  return (
    <div className="flex flex-col lg:h-full">
      {/* ── Header ─────────────────────────────────── */}
      <div className="shrink-0 pb-3 mb-1">
        <Verdict
          className="mb-3"
          headline={
            transactions.length === 0
              ? (activeFilters > 0 || searchQuery
                  ? <>Nothing matches what you&rsquo;re looking for.</>
                  : <>Nothing recorded here yet.</>)
              : totalNet >= 0
              ? <>You&rsquo;re up <Em tone="good">{formatVND(totalNet)}</Em> across {transactions.length} transaction{transactions.length === 1 ? '' : 's'}.</>
              : <>You&rsquo;re down <Em tone="bad">{formatVND(-totalNet)}</Em> across {transactions.length} transaction{transactions.length === 1 ? '' : 's'}.</>
          }
          support={transactions.length > 0
            ? <>
                <span>{formatVND(totalIncome)} in</span><Dot /><span>{formatVND(totalExpense)} out</span>
                {biggestExpense && <><Dot /><span>largest: {biggestExpense.categories?.name ?? 'Uncategorized'} {formatVND(biggestExpense.amount)}</span></>}
              </>
            : undefined}
        />

        {/* Toolbar — search expands inline from the icon */}
        <div className="flex items-center gap-2 mb-3">
          {/* ViewSelector — collapses when search opens */}
          <div
            className="grid shrink-0 overflow-hidden"
            style={{
              gridTemplateColumns: searchOpen ? '0fr' : '1fr',
              opacity: searchOpen ? 0 : 1,
              transition: 'grid-template-columns 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.18s ease',
            }}
          >
            <div className="min-w-0 overflow-hidden">
              <ViewSelector view={view} />
            </div>
          </div>

          {/* Search input — slides in from right */}
          {searchOpen && (
            <div className="animate-search-expand flex-1 min-w-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch()
                    if (e.key === 'Escape') clearSearch()
                  }}
                  placeholder="Search by note… (Enter)"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Right buttons */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Link href="/transactions/import" className="px-2 py-2 text-xs font-medium text-gray-500 hover:text-brand whitespace-nowrap">
              Import CSV
            </Link>
            <button
              onClick={() => (selectedIds ? endSelection() : setSelectedIds(new Set()))}
              aria-pressed={!!selectedIds}
              className={`px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                selectedIds ? 'text-brand' : 'text-gray-500 hover:text-brand'
              }`}
            >
              {selectedIds ? 'Done' : 'Select'}
            </button>
            <button
              onClick={searchOpen ? clearSearch : () => setSearchOpen(true)}
              className={`p-2 rounded-xl border transition-colors ${
                searchOpen
                  ? 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-800'
                  : 'text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'
              }`}
              aria-label={searchOpen ? 'Close search' : 'Search'}
            >
              {searchOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              aria-label={activeFilters > 0 ? `Filters (${activeFilters} active)` : 'Filter transactions'}
              className={`relative p-2 rounded-xl border transition-colors ${
                activeFilters > 0
                  ? 'text-brand border-brand bg-brand-soft'
                  : 'text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              {activeFilters > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-fill text-white text-[10px] font-semibold leading-4 text-center">
                  {activeFilters}
                </span>
              )}
            </button>
            {/* Desktop only — on a phone the bottom nav's centre button already
                covers this, and it opens the full-page form instead of a dialog.
                The wrapper carries the visibility: Button sets its own
                `inline-flex`, which outranks a `hidden` passed via className. */}
            <div className="hidden md:block">
              <Button onClick={() => openModal()}>
                {PLUS_ICON}
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {isSearchMode ? (
          /* Search results — flat list, no calendar */
          <div className="lg:flex lg:flex-col lg:h-full">
            <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
              <TransactionList
                key={`search-${filter}`}
                transactions={transactions}
                filter={filter}
                onFilter={setFilter}
                onEdit={openModal}
                onDelete={handleDelete}
                onAdd={() => openModal()}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onClearSelection={clearPicks}
                scrollableBody
                hideSummary
              />
            </div>
          </div>
        ) : view === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-full">
            <div className="lg:overflow-y-auto">
              <TransactionCalendar
                transactions={transactions}
                period={period}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div
              key={selectedDate ?? '__all__'}
              className="animate-fade-slide-in flex flex-col lg:overflow-hidden"
            >
              <TransactionList
                key={filter}
                transactions={displayedTransactions}
                filter={filter}
                onFilter={setFilter}
                onEdit={openModal}
                onDelete={handleDelete}
                onAdd={() => openModal()}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onClearSelection={clearPicks}
                scrollableBody
                hideSummary
              />
            </div>
          </div>
        ) : (
          <div className="lg:flex lg:flex-col lg:h-full">
            <div className="flex justify-end mb-4">
              <PeriodNavigator view={view} period={period} />
            </div>
            <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
              <TransactionList
                key={filter}
                transactions={transactions}
                filter={filter}
                onFilter={setFilter}
                onEdit={openModal}
                onDelete={handleDelete}
                onAdd={() => openModal()}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onClearSelection={clearPicks}
                scrollableBody
                hideSummary
              />
            </div>
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterModal
          filters={filters}
          categories={categories}
          wallets={wallets}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {modalOpen && (
        <TransactionModal
          key={editingTx?.id ?? 'new'}
          editing={editingTx}
          categories={categories}
          wallets={wallets}
          debts={debts}
          frequent={frequent}
          recent={recent}
          defaultDate={editingTx ? undefined : defaultDate}
          onClose={() => { setModalOpen(false); setEditingTx(null) }}
        />
      )}

      {/* Hidden while the confirm is up: the bar is stacked above modals. */}
      {selectedIds && !confirmBulkDelete && (
        <SelectionBar
          selected={selectedTransactions}
          categories={categories}
          isPending={isPending}
          onCategorize={categorizeSelection}
          onDelete={() => setConfirmBulkDelete(true)}
          onCancel={endSelection}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmModal
          title={`Delete ${plural(selectedTransactions.length, 'transaction')}?`}
          description="Every amount goes back to the wallet it came from, and a debt repayment reopens its debt. A batch this size is not offered as an undo, so it is confirmed here instead."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={deleteSelection}
          onClose={() => setConfirmBulkDelete(false)}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete transaction?"
          description={deleteConsequence}
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
