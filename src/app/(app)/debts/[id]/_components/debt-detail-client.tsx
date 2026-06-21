'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal, useModalClose } from '@/components/ui/modal'
import { AmountInput } from '@/components/ui/amount-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatVND } from '@/lib/utils/currency'
import { debtsApi, type Debt, type DebtPayment } from '@/lib/api/debts'
import type { Wallet } from '@/lib/api/wallets'

type DebtWithPayments = Debt & {
  debt_payments: DebtPayment[]
  wallets: { id: string; name: string } | null
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({
  debt,
  wallets,
  onClose,
}: {
  debt: DebtWithPayments
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
          <AmountInput label="Amount" name="amount" required />
          <CustomSelect label={debt.type === 'lend' ? 'Receive to' : 'Pay from'} name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="None" />
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

// ── Addition Modal ────────────────────────────────────────────────────────────

function AdditionModal({
  debt,
  wallets,
  onClose,
}: {
  debt: DebtWithPayments
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')

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
    setError(null)
    startTransition(async () => {
      try {
        await debtsApi.addDebt(debt.id, { amount, note: note || undefined, date, wallet_id: walletId || undefined })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  const walletLabel = debt.type === 'lend' ? 'Lend from wallet' : 'Receive to wallet'

  return (
    <Modal title="Add to debt" onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
        <p className="text-xs text-gray-400 mb-0.5">Current remaining</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Amount to add" name="amount" required />
          <CustomSelect label={walletLabel} name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="None" />
        </div>
        <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
        <Input label="Note (optional)" name="note" placeholder="e.g. Dinner at Pizza Hut" />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DebtDetailClient({
  debt,
  wallets,
}: {
  debt: DebtWithPayments
  wallets: Pick<Wallet, 'id' | 'name' | 'color' | 'is_default'>[]
}) {
  const [payOpen, setPayOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const isLend = debt.type === 'lend'
  const isCompleted = debt.status === 'completed'
  const isOverdue = debt.due_date && !isCompleted && new Date(debt.due_date) < new Date()
  const paidAmount = debt.amount - debt.remaining_amount
  const pct = debt.amount > 0 ? Math.min((paidAmount / debt.amount) * 100, 100) : 0
  const barColor = isCompleted ? '#10b981' : isLend ? '#6366f1' : '#f97316'

  const events = [...debt.debt_payments].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()
  )

  return (
    <>
      {/* Back */}
      <Link
        href="/debts"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
        </svg>
        Debts
      </Link>

      {/* Hero */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              isLend
                ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
            }`}>
              {debt.person_name[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{debt.person_name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isLend
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                }`}>
                  {isLend ? 'Lent' : 'Borrowed'}
                </span>
                {isCompleted && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">Done</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {debt.due_date && (
                  <p className={`text-xs ${isOverdue ? 'text-rose-500' : 'text-gray-400'}`}>
                    Due {new Date(debt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isOverdue && ' · Overdue'}
                  </p>
                )}
                {debt.wallets && <p className="text-xs text-gray-400">{debt.wallets.name}</p>}
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isCompleted && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setAddOpen(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                + Add
              </button>
              <Button onClick={() => setPayOpen(true)}>Record payment</Button>
            </div>
          )}
        </div>

        {/* Amounts */}
        <div className="flex justify-between text-sm mb-2 tabular-nums">
          <span className="text-gray-400">Paid {formatVND(paidAmount)}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatVND(debt.remaining_amount)} left</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5 tabular-nums">
          <span>{Math.round(pct)}% paid</span>
          <span>of {formatVND(debt.amount)}</span>
        </div>

        {debt.note && (
          <p className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">{debt.note}</p>
        )}
        {debt.person_contact && (
          <p className="text-xs text-gray-400 mt-1">{debt.person_contact}</p>
        )}
      </div>

      {/* Timeline */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">History</p>

      {events.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">No activity yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-800" />

          <div className="space-y-1">
            {events.map(ev => {
              const isAddition = ev.type === 'addition'
              return (
                <div key={ev.id} className="flex items-start gap-3 pl-1">
                  {/* Dot */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 mt-0.5 ${
                    isAddition
                      ? (isLend ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400')
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isAddition ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {isAddition ? 'Added to debt' : 'Payment recorded'}
                        </p>
                        {ev.note && <p className="text-xs text-gray-400 truncate mt-0.5">{ev.note}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(ev.paid_at + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                        isAddition
                          ? (isLend ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400')
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isAddition ? '+' : '−'}{formatVND(ev.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {payOpen && <PaymentModal debt={debt} wallets={wallets} onClose={() => setPayOpen(false)} />}
      {addOpen && <AdditionModal debt={debt} wallets={wallets} onClose={() => setAddOpen(false)} />}
    </>
  )
}
