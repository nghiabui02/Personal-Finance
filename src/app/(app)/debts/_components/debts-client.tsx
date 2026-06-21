'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TabGroup } from '@/components/ui/tab-group'
import { AmountInput } from '@/components/ui/amount-input'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { formatVND } from '@/lib/utils/currency'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const PENCIL = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
  </svg>
)
const TRASH = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)

// ── Debt Modal ────────────────────────────────────────────────────────────────

function DebtModal({
  editing,
  defaultType = 'lend',
  wallets,
  onClose,
}: {
  editing: Debt | null
  defaultType?: 'lend' | 'borrow'
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'lend' | 'borrow'>(editing?.type ?? defaultType)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [walletId, setWalletId] = useState(
    editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? ''
  )

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? ''
    const amount = Number(get('amount'))
    const person_name = get('person_name').trim()

    if (!person_name) { setError('Name is required.'); return }
    if (!editing && (!amount || amount <= 0)) { setError('Amount is required.'); return }

    setError(null)
    startTransition(async () => {
      try {
        if (editing) {
          await debtsApi.update(editing.id, {
            person_name,
            person_contact: get('person_contact') || undefined,
            due_date: dueDate || undefined,
            note: get('note') || undefined,
          })
        } else {
          await debtsApi.create({
            type,
            person_name,
            person_contact: get('person_contact') || undefined,
            amount,
            wallet_id: walletId || undefined,
            date,
            due_date: dueDate || undefined,
            note: get('note') || undefined,
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
    <Modal title={editing ? 'Edit debt' : 'New debt'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <TabGroup
            tabs={[{ key: 'lend', label: '↑ I lent' }, { key: 'borrow', label: '↓ I borrowed' }]}
            value={type}
            onChange={setType}
            activeColors={{ lend: '#6366f1', borrow: '#f97316' }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Person name" name="person_name" defaultValue={editing?.person_name ?? ''} required placeholder="e.g. Nguyen Van A" />
          <Input label="Contact (optional)" name="person_contact" defaultValue={editing?.person_contact ?? ''} placeholder="Phone / email" />
        </div>

        {!editing && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AmountInput label="Amount" name="amount" required />
              <CustomSelect label="Wallet" name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="None" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
              <DatePicker label="Due date (optional)" name="due_date" value={dueDate} onChange={setDueDate} />
            </div>
          </>
        )}

        {editing && (
          <DatePicker label="Due date (optional)" name="due_date" value={dueDate} onChange={setDueDate} />
        )}

        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="Purpose..." />

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({
  debt,
  wallets,
  onClose,
}: {
  debt: Debt
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
    const note = (form.elements.namedItem('note') as HTMLInputElement).value

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (amount > debt.remaining_amount) { setError(`Max is ${formatVND(debt.remaining_amount)}.`); return }

    setError(null)
    startTransition(async () => {
      try {
        await debtsApi.addPayment(debt.id, { amount, note: note || undefined, wallet_id: walletId || undefined, date })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
        <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Payment amount" name="amount" required />
          <CustomSelect
            label={debt.type === 'lend' ? 'Receive to wallet' : 'Pay from wallet'}
            name="wallet_id"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder="None"
          />
        </div>
        <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
        <Input label="Note (optional)" name="note" placeholder="e.g. Bank transfer" />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Record'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Debt Card ─────────────────────────────────────────────────────────────────

function DebtCard({
  debt,
  onEdit,
  onDelete,
  onPay,
}: {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
}) {
  const paidAmount = debt.amount - debt.remaining_amount
  const pct = debt.amount > 0 ? Math.min((paidAmount / debt.amount) * 100, 100) : 0
  const isCompleted = debt.status === 'completed'
  const isLend = debt.type === 'lend'
  const isOverdue = debt.due_date && !isCompleted && new Date(debt.due_date) < new Date()

  const barColor = isCompleted ? '#10b981' : isLend ? '#6366f1' : '#f97316'

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 transition-shadow hover:shadow-md ${isCompleted ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-gray-100 dark:border-gray-800'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/debts/${debt.id}`} className="flex items-center gap-2.5 min-w-0 group">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            isLend
              ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
              : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
          }`}>
            {debt.person_name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:underline underline-offset-2">{debt.person_name}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                isLend
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
              }`}>
                {isLend ? 'Lent' : 'Borrowed'}
              </span>
              {isCompleted && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">Done</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {debt.due_date && (
                <p className={`text-xs ${isOverdue ? 'text-rose-500' : 'text-gray-400'}`}>
                  Due {new Date(debt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {isOverdue && ' · Overdue'}
                </p>
              )}
              {debt.wallets && (
                <p className="text-xs text-gray-400">{debt.wallets.name}</p>
              )}
            </div>
          </div>
        </Link>

        <div className="flex gap-0.5 shrink-0">
          {!isCompleted && (
            <button onClick={onPay} title="Record payment"
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{PENCIL}</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">{TRASH}</button>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-1.5 tabular-nums">
        <span>Paid {formatVND(paidAmount)}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{formatVND(debt.remaining_amount)} left</span>
      </div>
      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full animate-bar-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right tabular-nums">of {formatVND(debt.amount)}</p>
    </div>
  )
}

// ── Debt Section ──────────────────────────────────────────────────────────────

function DebtSection({
  title,
  color,
  debts,
  totalActive,
  onEdit,
  onDelete,
  onPay,
  onAdd,
}: {
  title: string
  color: 'indigo' | 'orange'
  debts: Debt[]
  totalActive: number
  onEdit: (d: Debt) => void
  onDelete: (id: string) => void
  onPay: (d: Debt) => void
  onAdd: () => void
}) {
  const colorCls = color === 'indigo'
    ? { amount: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400', toggle: 'text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300' }
    : { amount: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400', toggle: 'text-orange-500 hover:text-orange-700 dark:hover:text-orange-300' }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {debts.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colorCls.badge}`}>{debts.length}</span>
          )}
        </div>
        <span className={`text-sm font-semibold tabular-nums ${colorCls.amount}`}>{formatVND(totalActive)}</span>
      </div>

      {debts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-8 flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400">No debts yet</p>
          <button onClick={onAdd} className={`text-xs font-medium ${colorCls.toggle} transition-colors`}>+ Add</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {debts.map((d, idx) => (
            <div key={d.id} className="animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <DebtCard debt={d}
                onEdit={() => onEdit(d)} onDelete={() => onDelete(d.id)} onPay={() => onPay(d)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DebtsClient({
  debts,
  wallets,
}: {
  debts: Debt[]
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [defaultType, setDefaultType] = useState<'lend' | 'borrow'>('lend')
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const lendDebts = debts.filter(d => d.type === 'lend' && (tab === 'active' ? d.status !== 'completed' : d.status === 'completed'))
  const borrowDebts = debts.filter(d => d.type === 'borrow' && (tab === 'active' ? d.status !== 'completed' : d.status === 'completed'))

  const activeCount = debts.filter(d => d.status !== 'completed').length
  const completedCount = debts.filter(d => d.status === 'completed').length

  const totalLent = debts.filter(d => d.type === 'lend' && d.status !== 'completed').reduce((s, d) => s + d.remaining_amount, 0)
  const totalBorrowed = debts.filter(d => d.type === 'borrow' && d.status !== 'completed').reduce((s, d) => s + d.remaining_amount, 0)

  function openNew(type: 'lend' | 'borrow') {
    setDefaultType(type)
    setEditingDebt(null)
    setModalOpen(true)
  }

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await debtsApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <button
        onClick={() => openNew('lend')}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-[colors,transform] hover:scale-110 active:scale-95 flex items-center justify-center"
        aria-label="New debt"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <TabGroup
        tabs={[
          { key: 'active', label: `Active (${activeCount})` },
          { key: 'completed', label: `Completed (${completedCount})` },
        ]}
        value={tab}
        onChange={setTab}
        className="w-fit mb-5"
      />

      <div className="space-y-8">
        <DebtSection
          title="Lent"
          color="indigo"
          debts={lendDebts}
          totalActive={totalLent}
          onEdit={d => { setEditingDebt(d); setModalOpen(true) }}
          onDelete={id => setConfirmId(id)}
          onPay={d => setPayingDebt(d)}
          onAdd={() => openNew('lend')}
        />
        <DebtSection
          title="Borrowed"
          color="orange"
          debts={borrowDebts}
          totalActive={totalBorrowed}
          onEdit={d => { setEditingDebt(d); setModalOpen(true) }}
          onDelete={id => setConfirmId(id)}
          onPay={d => setPayingDebt(d)}
          onAdd={() => openNew('borrow')}
        />
      </div>

      {modalOpen && (
        <DebtModal
          key={editingDebt?.id ?? 'new'}
          editing={editingDebt}
          defaultType={defaultType}
          wallets={wallets}
          onClose={() => { setModalOpen(false); setEditingDebt(null) }}
        />
      )}
      {payingDebt && (
        <PaymentModal debt={payingDebt} wallets={wallets} onClose={() => setPayingDebt(null)} />
      )}
      {confirmId && (
        <ConfirmModal
          title="Delete debt?"
          description="This debt and all payment history will be permanently deleted."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
