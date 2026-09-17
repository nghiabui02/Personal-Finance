'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category } from '@/lib/api/categories'
import { toast } from '@/components/ui/toast'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type Wallet, walletsApi, WALLET_TYPE_LABELS } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Type in the balance the bank actually shows; the gap is filed as one
 * adjustment transaction. Nothing is overwritten, so the history still adds up.
 */
export function ReconcileModal({
  wallet,
  categories,
  onClose,
}: {
  wallet: Wallet
  categories: Category[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(localYMD())
  const [actual, setActual] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState('')

  const isCredit = wallet.type === 'credit'
  const recorded = Number(wallet.balance)
  const delta = actual === null ? null : actual - recorded

  // The gap becomes an income or an expense row, so only categories pointing
  // that way can hold it.
  const direction = delta !== null && delta > 0 ? 'income' : 'expense'
  const reasonOptions = [
    { value: '', label: 'Balance correction' },
    ...categories
      .filter(c => c.type === direction)
      .map(c => ({ value: c.id, label: `${c.icon ?? ''} ${c.name}`.trim() })),
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const value = Number((form.elements.namedItem('actual_balance') as HTMLInputElement).value)
    const note = (form.elements.namedItem('note') as HTMLInputElement).value.trim()

    if (!Number.isFinite(value)) { setError('Enter the balance shown by your bank.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const result = await walletsApi.reconcile(wallet.id, {
          actual_balance: value,
          note,
          date,
          category_id: categoryId || undefined,
        })
        toast.success(
          result.delta === 0
            ? 'Already matches — nothing to adjust.'
            : `Adjusted by ${result.delta > 0 ? '+' : '−'}${formatVND(Math.abs(result.delta))}.`
        )
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={`Reconcile ${wallet.name}`} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-hairline px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-1">
            {isCredit ? 'Recorded available credit' : 'Recorded balance'}
          </p>
          <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatVND(recorded)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{WALLET_TYPE_LABELS[wallet.type]}</p>
        </div>

        <AmountInput
          label={isCredit ? 'Available credit on your statement' : 'Balance shown by your bank'}
          name="actual_balance"
          defaultValue={recorded}
          onValueChange={setActual}
          required
        />

        {delta !== null && (
          <div className="rounded-xl border border-hairline px-4 py-3">
            {delta === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Matches what&rsquo;s recorded — nothing to adjust.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Files{' '}
                <span className={`font-semibold tabular-nums ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {delta > 0 ? '+' : '−'}{formatVND(Math.abs(delta))}
                </span>{' '}
                {categoryId
                  ? `as ${reasonOptions.find(o => o.value === categoryId)?.label ?? 'that category'} — counted in your ${direction === 'income' ? 'income' : 'spending'}.`
                  : 'as a balance correction — kept out of your income and spending totals.'}
              </p>
            )}
          </div>
        )}

        {delta !== null && delta !== 0 && reasonOptions.length > 1 && (
          <CustomSelect
            label="Reason"
            name="reason"
            options={reasonOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
          />
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 items-end">
          <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
          <Input
            label="Note (optional)"
            name="note"
            placeholder="e.g. Interest"
          />
        </div>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isPending || delta === 0} className="flex-1">
            {isPending ? 'Saving…' : 'Reconcile'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
