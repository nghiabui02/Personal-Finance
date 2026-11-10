'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { toWalletOptions, type WalletChoice } from '@/lib/api/wallets'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { errorMessage } from '@/lib/utils/errors'

/** Records a payment against a debt — from the debts list and from a debt's
 *  own page. Never more than what is still owed. */
export function PaymentModal({
  debt,
  wallets,
  onClose,
}: {
  debt: Debt
  wallets: WalletChoice[]
  onClose: () => void
}) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [date, setDate] = useState(localYMD())
  const [amount, setAmount] = useState(0)

  const walletOptions = toWalletOptions(wallets)

  const overpaying = amount > debt.remaining_amount
  const remainingAfter = Math.max(0, debt.remaining_amount - amount)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
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
        setError(errorMessage(err))
      }
    })
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
        </div>
        {amount > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">After this payment</p>
            <p className={`font-semibold tabular-nums ${
              overpaying ? 'text-rose-600 dark:text-rose-400' : remainingAfter === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {overpaying ? 'Exceeds remaining' : formatVND(remainingAfter)}
            </p>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Payment amount" name="amount" required onValueChange={setAmount} />
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
