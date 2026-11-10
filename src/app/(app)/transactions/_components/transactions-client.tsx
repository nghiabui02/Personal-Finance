'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { type Category } from '@/lib/api/categories'
import { type Transaction } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import type { DebtOption } from '@/lib/types'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import type { HistoryTransaction } from '@/lib/transaction-matching'
import { countActiveFilters, type TransactionFilters } from '@/lib/server/transaction-filters'
import { plural } from '@/lib/utils/plural'
import { FilterModal } from './filter-modal'
import { PeriodNavigator, type ViewMode } from './period-navigator'
import { SelectionBar } from './selection-bar'
import { TransactionCalendar } from './transaction-calendar'
import { TransactionList, type Filter } from './transaction-list'
import { TransactionModal } from './transaction-modal'
import { TransactionsToolbar } from './transactions-toolbar'
import { TransactionsVerdict } from './transactions-verdict'
import { useNoteSearch } from './use-note-search'
import { useTransactionDeletion } from './use-transaction-deletion'
import { useTransactionSelection } from './use-transaction-selection'

/**
 * The transactions screen: verdict, toolbar, then the list — beside a calendar
 * in month view, flat for a week, a day or a search.
 *
 * This file only lays the screen out and wires the pieces together. Each
 * behaviour lives in its own hook: `useNoteSearch`, `useTransactionDeletion`
 * (delete + undo) and `useTransactionSelection` (bulk actions).
 */

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
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const activeFilters = countActiveFilters(filters)
  const isSearchMode = !!searchQuery
  const search = useNoteSearch(searchQuery)
  const deletion = useTransactionDeletion(transactions)
  const selection = useTransactionSelection(
    transactions,
    `${view}::${period}::${searchQuery}::${filter}::${selectedDate ?? ''}`,
  )

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

  // The three layouts below show the same list; only its rows and its key differ.
  const listProps = {
    filter,
    onFilter: setFilter,
    onEdit: openModal,
    onDelete: deletion.requestDelete,
    onAdd: () => openModal(),
    selectedIds: selection.selectedIds,
    onToggleSelect: selection.toggle,
    onClearSelection: selection.clearPicks,
  }

  return (
    <div className="flex flex-col lg:h-full">
      <div className="shrink-0 pb-3 mb-1">
        <TransactionsVerdict transactions={transactions} isNarrowed={activeFilters > 0 || isSearchMode} />
        <TransactionsToolbar
          view={view}
          search={search}
          isSelecting={selection.isActive}
          activeFilters={activeFilters}
          onToggleSelecting={selection.toggleMode}
          onOpenFilters={() => setFilterOpen(true)}
          onAdd={() => openModal()}
        />
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {isSearchMode ? (
          /* Search results — flat list, no calendar */
          <div className="lg:flex lg:flex-col lg:h-full">
            <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
              <TransactionList key={`search-${filter}`} transactions={transactions} {...listProps} />
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
              <TransactionList key={filter} transactions={displayedTransactions} {...listProps} />
            </div>
          </div>
        ) : (
          <div className="lg:flex lg:flex-col lg:h-full">
            <div className="flex justify-end mb-4">
              <PeriodNavigator view={view} period={period} />
            </div>
            <div className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:overflow-hidden">
              <TransactionList key={filter} transactions={transactions} {...listProps} />
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
      {selection.isActive && !selection.isConfirmingDelete && (
        <SelectionBar
          selected={selection.selected}
          categories={categories}
          isPending={selection.isPending}
          onCategorize={selection.categorize}
          onDelete={selection.askDelete}
          onCancel={selection.end}
        />
      )}

      {selection.isConfirmingDelete && (
        <ConfirmModal
          title={`Delete ${plural(selection.selected.length, 'transaction')}?`}
          description="Every amount goes back to the wallet it came from, and a debt repayment reopens its debt. A batch this size is not offered as an undo, so it is confirmed here instead."
          confirmLabel="Delete"
          isPending={selection.isPending}
          onConfirm={selection.deleteSelected}
          onClose={selection.cancelDelete}
        />
      )}

      {deletion.isConfirming && (
        <ConfirmModal
          title="Delete transaction?"
          description={deletion.consequence}
          confirmLabel="Delete"
          isPending={deletion.isPending}
          onConfirm={deletion.confirm}
          onClose={deletion.cancel}
        />
      )}
    </div>
  )
}
