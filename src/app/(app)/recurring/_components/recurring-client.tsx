'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CategorySelect } from '@/components/ui/category-select'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TabGroup } from '@/components/ui/tab-group'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type Category } from '@/lib/api/categories'
import { type Wallet } from '@/lib/api/wallets'
import { type RecurringTransaction, FREQUENCY_LABELS, recurringApi } from '@/lib/api/recurring-transactions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

// ── Modal ─────────────────────────────────────────────────────────────────────

function RecurringModal({
  editing,
  categories,
  wallets,
  onClose,
}: {
  editing: RecurringTransaction | null
  categories: Category[]
  wallets: Wallet[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(editing?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(editing?.start_date ?? localYMD())
  const [endDate, setEndDate] = useState(editing?.end_date ?? '')
  const [showFee, setShowFee] = useState(Number(editing?.bank_fee) > 0)

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const getValue = (n: string) => (form.elements.namedItem(n) as HTMLInputElement)?.value ?? ''
    const amount = Number(getValue('amount'))
    // frequency comes from state, not form input
    const note = getValue('note')
    const fee = showFee ? Number(getValue('fee') || '0') : 0

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (!startDate) { setError('Start date is required.'); return }

    setError(null)
    startTransition(async () => {
      try {
        if (editing) {
          await recurringApi.update(editing.id, {
            amount, frequency,
            category_id: categoryId || undefined,
            wallet_id: walletId || undefined,
            note: note || undefined,
            end_date: endDate || undefined,
            bank_fee: fee > 0 ? fee : null,
          })
        } else {
          await recurringApi.create({
            type: txType, amount, frequency, start_date: startDate,
            category_id: categoryId || undefined,
            wallet_id: walletId || undefined,
            note: note || undefined,
            end_date: endDate || undefined,
            bank_fee: fee > 0 ? fee : undefined,
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
    <Modal title={editing ? 'Edit recurring' : 'New recurring transaction'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        {!editing && (
          <TabGroup
            tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
            value={txType}
            onChange={t => { setTxType(t); setCategoryId('') }}
            activeColors={{ expense: '#ef4444', income: '#22c55e' }}
          />
        )}

        {/* Amount + Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Amount" name="amount" defaultValue={editing?.amount} required />
          <CustomSelect
            label="Repeat"
            name="frequency"
            options={Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={frequency}
            onChange={v => setFrequency(v as RecurringTransaction['frequency'])}
          />
        </div>

        {/* Category + Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <CategorySelect
            categories={categories} filterType={txType}
            value={categoryId} onChange={setCategoryId} searchable />
          {wallets.length > 0
            ? <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
            : <div />}
        </div>

        {/* Start + End date */}
        {!editing ? (
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Start date" name="start_date" value={startDate} onChange={setStartDate} required />
            <DatePicker label="End date (optional)" name="end_date" value={endDate} onChange={setEndDate} />
          </div>
        ) : (
          <DatePicker label="End date (optional)" name="end_date" value={endDate} onChange={setEndDate} />
        )}

        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="e.g. Netflix subscription" />

        {/* Bank fee — persisted on the rule, then folded into every generated
            transaction (amount + fee), same as the transaction modal */}
        {txType === 'expense' && !!walletId && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            {!showFee ? (
              <button type="button" onClick={() => setShowFee(true)}
                className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
                Add bank fee (for international transactions)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Bank fee</p>
                  <button type="button" onClick={() => setShowFee(false)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Remove
                  </button>
                </div>
                <AmountInput label="" name="fee" defaultValue={editing?.bank_fee ?? 0} autoFocus />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Included in each generated transaction — the total charged will be amount + fee.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RecurringCard({
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
    catch { /* toast later */ }
    finally { setSkipping(false) }
  }

  async function handleToggleActive() {
    setTogglingActive(true)
    try { await recurringApi.setActive(item.id, !item.active); router.refresh() }
    catch { /* toast later */ }
    finally { setTogglingActive(false) }
  }

  function formatDate(d: string) {
    const [y, m, day] = d.split('-')
    return `${day}-${m}-${y}`
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${isExpired || !item.active ? 'opacity-60' : ''} border-gray-200 dark:border-gray-800`}>
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
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'
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
          <span className={`text-sm font-semibold tabular-nums ${
            item.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {item.type === 'income' ? '+' : '−'}{formatVND(item.amount)}
          </span>
          <div className="flex gap-0.5">
            {!isExpired && (
              <button onClick={handleToggleActive} disabled={togglingActive}
                title={item.active ? 'Pause' : 'Resume'}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-40">
                {item.active ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v13.5l13.5-6.75-13.5-6.75Z" />
                  </svg>
                )}
              </button>
            )}
            {!isExpired && item.active && item.next_run_date && (
              <button onClick={handleSkip} disabled={skipping} title="Skip next occurrence"
                className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors disabled:opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v13.5l9-6.75-9-6.75Zm10.5 0v13.5" />
                </svg>
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RecurringClient({
  items, categories, wallets,
}: {
  items: RecurringTransaction[]
  categories: Category[]
  wallets: Wallet[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const active  = items.filter(i => !i.end_date || i.end_date >= localYMD())
  const expired = items.filter(i => i.end_date && i.end_date < localYMD())

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await recurringApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <button
        onClick={() => { setEditingItem(null); setModalOpen(true) }}
        className="fixed bottom-above-nav right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-[colors,transform] hover:scale-110 active:scale-95 flex items-center justify-center"
        aria-label="New recurring transaction"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No recurring transactions yet.</p>
          <button onClick={() => { setEditingItem(null); setModalOpen(true) }} className="mt-2 text-sm text-blue-600 hover:underline">
            Add your first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Active ({active.length})</p>
              <div className="space-y-2">
                {active.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={() => { setEditingItem(item); setModalOpen(true) }}
                    onDelete={() => setConfirmId(item.id)} />
                ))}
              </div>
            </section>
          )}
          {expired.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Ended ({expired.length})</p>
              <div className="space-y-2">
                {expired.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={() => { setEditingItem(item); setModalOpen(true) }}
                    onDelete={() => setConfirmId(item.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {modalOpen && (
        <RecurringModal key={editingItem?.id ?? 'new'} editing={editingItem}
          categories={categories} wallets={wallets}
          onClose={() => { setModalOpen(false); setEditingItem(null) }} />
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete recurring transaction?"
          description="Future transactions won't be created. Past transactions already created are kept."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)} />
      )}
    </>
  )
}
