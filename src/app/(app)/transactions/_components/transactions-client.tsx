'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast, toastError } from '@/components/ui/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Dot, Em, Verdict } from '@/components/ui/verdict'
import { formatVND } from '@/lib/utils/currency'
import { type Category } from '@/lib/api/categories'
import { isStandalone, type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { DebtOption } from '@/lib/types'
import { TransactionModal } from './transaction-modal'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import type { HistoryTransaction } from '@/lib/transaction-matching'
import { countActiveFilters, type TransactionFilters } from '@/lib/server/transaction-filters'
import { FilterModal } from './filter-modal'
import { PeriodNavigator, ViewSelector, type ViewMode } from './period-navigator'
import { TransactionCalendar } from './transaction-calendar'
import { TransactionList, type Filter } from './transaction-list'
import { SelectionBar } from './selection-bar'

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
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

const PLUS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)


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
