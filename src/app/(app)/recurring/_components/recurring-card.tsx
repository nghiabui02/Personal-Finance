'use client'

import { toastError } from '@/components/ui/toast'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type RecurringTransaction, FREQUENCY_LABELS, recurringApi } from '@/lib/api/recurring-transactions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SignedAmount } from '@/components/ui/signed-amount'

/** One rule on the list: what it is, when it next runs, and what can be done with it. */
export function RecurringCard({
  item, onEdit, onDelete,
}: {
  item: RecurringTransaction
  onEdit: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const [skipping, setSkipping] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const cat = item.categories
  const today = localYMD()
  const isOverdue = item.next_run_date && item.next_run_date <= today
  const isExpired = item.end_date && item.end_date < today

  async function handleSkip() {
    setSkipping(true)
    try { await recurringApi.skip(item.id); router.refresh() }
    catch (err) { toastError(err, 'Could not skip the next occurrence.') }
    finally { setSkipping(false) }
  }

  async function handleToggleActive() {
    setTogglingActive(true)
    try { await recurringApi.setActive(item.id, !item.active); router.refresh() }
    catch (err) { toastError(err, `Could not ${item.active ? 'pause' : 'resume'} this rule.`) }
    finally { setTogglingActive(false) }
  }

  function formatDate(d: string) {
    const [y, m, day] = d.split('-')
    return `${day}-${m}-${y}`
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-hairline p-4 ${isExpired || !item.active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}>
            {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{cat?.name?.[0] ?? '↻'}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {item.note || cat?.name || 'Recurring'}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                item.type === 'expense'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              }`}>
                {FREQUENCY_LABELS[item.frequency]}
              </span>
              {isExpired && <span className="text-xs text-gray-400">Ended</span>}
              {!isExpired && !item.active && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium shrink-0">
                  Paused
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
              {item.wallets && <span>{item.wallets.name}</span>}
              {item.next_run_date && (
                <span className={isOverdue && !isExpired ? 'text-orange-500' : ''}>
                  Next: {formatDate(item.next_run_date)}
                  {isOverdue && !isExpired && ' · Due'}
                </span>
              )}
              {item.end_date && <span>Until {formatDate(item.end_date)}</span>}
              {Number(item.bank_fee) > 0 && <span>+{formatVND(item.bank_fee!)} fee</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SignedAmount amount={item.amount} positive={item.type === 'income'} className="text-sm" />
          <div className="flex gap-0.5">
            {!isExpired && (
              <IconButton label={item.active ? 'Pause' : 'Resume'} onClick={handleToggleActive}
                disabled={togglingActive} tone="brand">
                {item.active ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v13.5l13.5-6.75-13.5-6.75Z" />
                  </svg>
                )}
              </IconButton>
            )}
            {!isExpired && item.active && item.next_run_date && (
              <IconButton label="Skip next occurrence" onClick={handleSkip} disabled={skipping} tone="brand">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v13.5l9-6.75-9-6.75Zm10.5 0v13.5" />
                </svg>
              </IconButton>
            )}
            <IconButton label="Edit recurring" onClick={onEdit}>{EditIcon}</IconButton>
            <IconButton label="Delete recurring" onClick={onDelete} tone="danger">{TrashIcon}</IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
