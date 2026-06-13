'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { formatVND } from '@/lib/utils/currency'
import { type Category } from '@/lib/api/categories'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { TransactionModal } from './transaction-modal'
import { MonthSelector } from './month-selector'

type Filter = 'all' | 'income' | 'expense'

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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

interface TransactionsClientProps {
  transactions: Transaction[]
  categories: Category[]
  wallets: Wallet[]
  month: string
}

export default function TransactionsClient({
  transactions,
  categories,
  wallets,
  month,
}: TransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = filter === 'all' ? transactions : transactions.filter(tx => tx.type === filter)
  const groups = groupByDate(filtered)

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0)
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)

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
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Track your income and expenses</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MonthSelector month={month} basePath="/transactions" />
          <Button onClick={() => openModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Income', value: totalIncome, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Expense', value: totalExpense, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Net', value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bg: 'bg-white dark:bg-gray-900' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
            <p className={`text-sm font-semibold tabular-nums ${item.color}`}>{formatVND(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-5">
        {(['all', 'expense', 'income'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No transactions this month.</p>
          <button onClick={() => openModal()} className="mt-2 text-sm text-blue-600 hover:underline">
            Add your first one
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, txs]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {formatDateHeader(date)}
                </p>
                <p className="text-xs text-gray-400 tabular-nums">
                  {formatVND(txs.reduce((s, tx) => s + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0))}
                </p>
              </div>

              {/* Transactions */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {txs.map(tx => {
                  const cat = tx.categories
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 group">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
                        style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
                      >
                        {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{cat?.name?.[0] ?? '?'}</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {tx.note || cat?.name || 'Uncategorized'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {cat?.name && tx.note ? cat.name : tx.wallets?.name ?? ''}
                        </p>
                      </div>

                      {/* Amount */}
                      <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                        tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(tx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmId(tx.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TransactionModal
          key={editingTx?.id ?? 'new'}
          editing={editingTx}
          categories={categories}
          wallets={wallets}
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
    </>
  )
}
