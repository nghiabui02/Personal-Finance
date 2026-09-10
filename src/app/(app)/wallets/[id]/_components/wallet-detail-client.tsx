'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatVND } from '@/lib/utils/currency'
import { localYMD, shiftLocalDate } from '@/lib/utils/date'
import { walletsApi, type Wallet, type WalletTransaction, WALLET_TYPE_LABELS } from '@/lib/api/wallets'

const WALLET_ICONS: Record<Wallet['type'], string> = {
  cash: '💵',
  bank: '🏦',
  e_wallet: '📱',
  investment: '📈',
  other: '💼',
  credit: '💳',
}

function formatDateHeader(dateStr: string): string {
  const today = localYMD()
  if (dateStr === today) return 'Today'
  if (dateStr === shiftLocalDate(today, -1)) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: dateStr.slice(0, 4) !== today.slice(0, 4) ? 'numeric' : undefined,
  })
}

const TransferIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>
  </svg>
)

export default function WalletDetailClient({
  wallet,
  initialTransactions,
  initialHasMore,
  totalIncome,
  totalExpense,
}: {
  wallet: Wallet
  initialTransactions: WalletTransaction[]
  initialHasMore: boolean
  totalIncome: number
  totalExpense: number
}) {
  const bg = wallet.color ?? '#3b82f6'
  const defaultIcon = WALLET_ICONS[wallet.type]

  const [transactions, setTransactions] = useState(initialTransactions)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Load the next page when the sentinel at the bottom of the list scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingRef.current) return
      loadingRef.current = true
      try {
        const { transactions: next, hasMore: more } = await walletsApi.transactions(wallet.id, transactions.length)
        setTransactions(prev => {
          const seen = new Set(prev.map(t => t.id))
          return [...prev, ...next.filter(t => !seen.has(t.id))]
        })
        setHasMore(more)
      } catch {
        // Network hiccup — leave hasMore as-is so scrolling retries
      } finally {
        loadingRef.current = false
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [wallet.id, transactions.length, hasMore])

  const groups = Object.entries(
    transactions.reduce<Record<string, WalletTransaction[]>>((acc, tx) => {
      const d = tx.transaction_date
      acc[d] = acc[d] ?? []
      acc[d].push(tx)
      return acc
    }, {})
  )

  return (
    <>
      {/* Back */}
      <Link
        href="/wallets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
        </svg>
        Wallets
      </Link>

      {/* Hero */}
      <div
        className="rounded-2xl p-5 text-white mb-5"
        style={{ background: `linear-gradient(135deg, ${bg}ee, ${bg}99)` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{wallet.icon || defaultIcon}</span>
          <span className="text-xs font-medium opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
            {WALLET_TYPE_LABELS[wallet.type]}
          </span>
          {wallet.is_default && (
            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">Default</span>
          )}
        </div>
        <p className="font-semibold text-base mb-2">{wallet.name}</p>
        <p className="text-[2.5rem] font-bold tracking-tight leading-none tabular-nums">
          {formatVND(wallet.balance)}
        </p>
        <div className="flex gap-5 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-0.5">In</p>
            <p className="text-sm font-semibold tabular-nums">+{formatVND(totalIncome)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-0.5">Out</p>
            <p className="text-sm font-semibold tabular-nums">−{formatVND(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* History */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {formatDateHeader(date)}
                </p>
                <p className={`text-xs tabular-nums font-medium ${
                  txs.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatVND(txs.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0))}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {txs.map(tx => {
                  const isTransfer = !!tx.transfer_pair_id
                  const cat = tx.categories
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                        style={{
                          backgroundColor: isTransfer
                            ? '#6366f122'
                            : cat?.color ? `${cat.color}22` : '#f3f4f6',
                          color: isTransfer ? '#6366f1' : cat?.color ?? '#9ca3af',
                        }}
                      >
                        {isTransfer ? <TransferIcon /> : (cat?.icon ?? '•')}
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {isTransfer ? (tx.type === 'income' ? 'Transfer in' : 'Transfer out') : (cat?.name ?? 'Uncategorized')}
                        </p>
                        {tx.note && (
                          <p className="text-xs text-gray-400 truncate">{tx.note}</p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
                        </p>
                        {Number(tx.bank_fee) > 0 && (
                          <p className="text-[10px] text-gray-400 tabular-nums">
                            incl. {formatVND(tx.bank_fee!)} fee
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-gray-400 dark:border-t-gray-400 animate-spin" />
            </div>
          )}
        </div>
      )}
    </>
  )
}
