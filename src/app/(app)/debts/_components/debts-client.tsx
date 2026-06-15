'use client'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { AmountInput } from '@/components/ui/amount-input'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatVND } from '@/lib/utils/currency'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

// ── Debt Modal (create/edit) ──────────────────────────────────────────────────

function DebtModal({
  editing,
  wallets,
  onClose,
}: {
  editing: Debt | null
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'lend' | 'borrow'>(editing?.type ?? 'lend')
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
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value
    const amount = Number(get('amount'))
    const person_name = get('person_name').trim()

    if (!person_name) { setError('Name is required.'); return }
    if (!amount || amount <= 0) { setError('Amount is required.'); return }

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
    <Modal title={editing ? 'Edit debt' : 'New debt'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {(['lend', 'borrow'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  type === t
                    ? t === 'lend' ? 'bg-blue-500 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                {t === 'lend' ? '↑ I lent' : '↓ I borrowed'}
              </button>
            ))}
          </div>
        )}

        <Input label="Person name" name="person_name" defaultValue={editing?.person_name ?? ''} required placeholder="e.g. Nguyen Van A" />
        <Input label="Contact (optional)" name="person_contact" defaultValue={editing?.person_contact ?? ''} placeholder="Phone / email" />

        {!editing && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AmountInput label="Amount" name="amount" required />
              <CustomSelect
                label="Wallet"
                name="wallet_id"
                options={walletOptions}
                value={walletId}
                onChange={setWalletId}
                placeholder="None"
              />
            </div>
            <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
          </>
        )}

        <DatePicker label="Due date (optional)" name="due_date" value={dueDate} onChange={setDueDate} />
        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="Purpose..." />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  const isLend = debt.type === 'lend'

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
        await debtsApi.addPayment(debt.id, { amount, note: note || undefined, wallet_id: walletId || undefined })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
        <p className="text-gray-500 dark:text-gray-400">Remaining</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatVND(debt.remaining_amount)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Payment amount" name="amount" required />
          <CustomSelect
            label={isLend ? 'Receive to wallet' : 'Pay from wallet'}
            name="wallet_id"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder="None"
          />
        </div>
        <Input label="Note (optional)" name="note" placeholder="e.g. Bank transfer" />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
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

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${isCompleted ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-gray-200 dark:border-gray-800'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isLend ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'}`}>
            {debt.person_name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{debt.person_name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isLend ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'}`}>
                {isLend ? 'Lent' : 'Borrowed'}
              </span>
              {isCompleted && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-medium shrink-0">Done</span>}
            </div>
            <div className="flex items-center gap-2">
              {debt.due_date && (
                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                  Due {new Date(debt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {isOverdue && ' · Overdue'}
                </p>
              )}
              {debt.wallets && (
                <p className="text-xs text-gray-400">{debt.wallets.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-0.5 shrink-0">
          {!isCompleted && (
            <button onClick={onPay} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors" title="Record payment">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
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

      {/* Progress */}
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>Paid {formatVND(paidAmount)}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{formatVND(debt.remaining_amount)} left</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right tabular-nums">of {formatVND(debt.amount)}</p>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

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
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const active = debts.filter(d => d.status !== 'completed')
  const completed = debts.filter(d => d.status === 'completed')
  const displayed = tab === 'active' ? active : completed

  const totalLent = active.filter(d => d.type === 'lend').reduce((s, d) => s + d.remaining_amount, 0)
  const totalBorrowed = active.filter(d => d.type === 'borrow').reduce((s, d) => s + d.remaining_amount, 0)

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
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Debts</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Track money lent and borrowed</p>
        </div>
        <Button onClick={() => { setEditingDebt(null); setModalOpen(true) }} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </Button>
      </div>

      {/* Summary */}
      {active.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">People owe me</p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{formatVND(totalLent)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">I owe others</p>
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{formatVND(totalBorrowed)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-5">
        {(['active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}>
            {t} {t === 'active' ? `(${active.length})` : `(${completed.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">{tab === 'active' ? 'No active debts.' : 'No completed debts yet.'}</p>
          {tab === 'active' && (
            <button onClick={() => { setEditingDebt(null); setModalOpen(true) }} className="mt-2 text-sm text-blue-600 hover:underline">
              Add one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map(d => (
            <DebtCard
              key={d.id}
              debt={d}
              onEdit={() => { setEditingDebt(d); setModalOpen(true) }}
              onDelete={() => setConfirmId(d.id)}
              onPay={() => setPayingDebt(d)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <DebtModal key={editingDebt?.id ?? 'new'} editing={editingDebt} wallets={wallets} onClose={() => { setModalOpen(false); setEditingDebt(null) }} />
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
