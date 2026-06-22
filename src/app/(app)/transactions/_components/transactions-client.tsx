'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TabGroup } from '@/components/ui/tab-group'
import { formatVND } from '@/lib/utils/currency'
import { type Category } from '@/lib/api/categories'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { localYMD, shiftLocalDate } from '@/lib/utils/date'
import { TransactionModal } from './transaction-modal'
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

function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const key = tx.transaction_date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

type DebtOption = { id: string; type: 'lend' | 'borrow'; person_name: string; remaining_amount: number }

interface TransactionsClientProps {
  transactions: Transaction[]
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  view: ViewMode
  period: string
}

const PAGE_SIZE = 10

const PENCIL_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
  </svg>
)
const TRASH_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)

function TransactionRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}) {
  const cat = tx.categories

  return (
    <div className="flex items-center gap-3 px-4 py-3">
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

      <span className={`text-sm font-semibold tabular-nums shrink-0 ${
        tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}>
        {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
      </span>

      <div className="flex gap-0.5">
        <button
          onClick={() => onEdit(tx)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {PENCIL_SVG}
        </button>
        <button
          onClick={() => onDelete(tx.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          {TRASH_SVG}
        </button>
      </div>
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
}) {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter)
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
            { label: 'Net',     value: net,     cls: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400' },
          ].map(item => (
            <div key={item.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{item.label}</p>
              <p className={`text-xs font-semibold tabular-nums ${item.cls}`}>{formatVND(item.value)}</p>
            </div>
          ))}
        </div>
      )}

      <TabGroup
        tabs={[
          { key: 'all',     label: 'All'     },
          { key: 'expense', label: 'Expense' },
          { key: 'income',  label: 'Income'  },
        ]}
        value={filter}
        onChange={onFilter}
        className={`w-fit mb-4 ${scrollableBody ? 'shrink-0' : ''}`}
      />

      <div className={scrollableBody ? 'flex-1 overflow-y-auto min-h-0' : ''}>
        {filtered.length === 0 ? (
          <EmptyState
            message={filter === 'all' ? 'No transactions.' : `No ${filter} transactions.`}
            action={filter === 'all' ? { label: 'Add one', onClick: onAdd } : undefined}
          />
        ) : (
          <div className="space-y-4">
            {groups.map(([date, txs], groupIdx) => (
              <div key={date} className="animate-fade-up" style={{ animationDelay: `${groupIdx * 40}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
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

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                  {txs.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      onEdit={onEdit}
                      onDelete={onDelete}
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

// ── Main client ───────────────────────────────────────────────────────────────

export default function TransactionsClient({
  transactions,
  categories,
  wallets,
  debts,
  view,
  period,
}: TransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const totalIncome  = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0)
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)
  const totalNet = totalIncome - totalExpense

  const displayedTransactions = selectedDate
    ? transactions.filter(tx => tx.transaction_date === selectedDate)
    : transactions

  function getDefaultDate(): string | undefined {
    if (view === 'day') return period
    if (view === 'month' && selectedDate) return selectedDate
    return undefined
  }

  function openModal(tx: Transaction | null = null) {
    setEditingTx(tx)
    setModalOpen(true)
  }

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await transactionsApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <div className="flex flex-col lg:h-full">
      <div className="shrink-0 pb-3 mb-1">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Income',  value: totalIncome,  cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Expense', value: totalExpense, cls: 'text-rose-600 dark:text-rose-400' },
            { label: 'Net',     value: totalNet,     cls: totalNet >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400' },
          ].map(item => (
            <div key={item.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{item.label}</p>
              <p className={`text-xs font-semibold tabular-nums ${item.cls}`}>{formatVND(item.value)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-5">
          <ViewSelector view={view} />
          <Button onClick={() => openModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {view === 'month' ? (
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
                onDelete={setConfirmId}
                onAdd={() => openModal()}
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
                onDelete={setConfirmId}
                onAdd={() => openModal()}
                scrollableBody
                hideSummary
              />
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <TransactionModal
          key={editingTx?.id ?? 'new'}
          editing={editingTx}
          categories={categories}
          wallets={wallets}
          debts={debts}
          defaultDate={editingTx ? undefined : getDefaultDate()}
          onClose={() => { setModalOpen(false); setEditingTx(null) }}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete transaction?"
          description="This transaction will be permanently deleted."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
