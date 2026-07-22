'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal, useModalClose } from '@/components/ui/modal'
import { AmountInput } from '@/components/ui/amount-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { debtsApi, type Debt } from '@/lib/api/debts'
import type { Wallet } from '@/lib/api/wallets'

// Records more money lent/borrowed against an existing debt — increases
// remaining_amount. Shared between the debts list page and the debt detail
// page so "add more" only has one implementation to keep in sync.
export function AdditionModal({
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
  const [date, setDate] = useState(localYMD())
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [amount, setAmount] = useState(0)

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  const remainingAfter = debt.remaining_amount + amount

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
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
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Current remaining</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
        </div>
        {amount > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">After this addition</p>
            <p className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(remainingAfter)}</p>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Amount to add" name="amount" required onValueChange={setAmount} />
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
