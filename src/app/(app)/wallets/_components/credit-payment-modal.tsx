'use client'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { CustomSelect } from '@/components/ui/custom-select'
import { AmountInput } from '@/components/ui/amount-input'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet } from '@/lib/api/wallets'
import { localYMD } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface CreditPaymentModalProps {
  creditWallet: Wallet
  wallets: Wallet[]
  onClose: () => void
}

export function CreditPaymentModal({ creditWallet, wallets, onClose }: CreditPaymentModalProps) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(localYMD())

  const sourceWallets = wallets.filter(w => w.type !== 'credit' && w.id !== creditWallet.id)
  const sourceOptions = sourceWallets.map(w => ({ value: w.id, label: w.name, color: w.color ?? undefined }))
  const [fromId, setFromId] = useState(sourceWallets.find(w => w.is_default)?.id ?? sourceWallets[0]?.id ?? '')

  const amountOwed = Math.max(0, Number(creditWallet.credit_limit ?? 0) - Number(creditWallet.balance))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
    const note = (form.elements.namedItem('note') as HTMLInputElement).value.trim()

    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return }
    if (!fromId) { setError('Select a source wallet.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/wallets/${creditWallet.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_wallet_id: fromId, amount, note, date }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Payment failed.')
          return
        }
        router.refresh()
        onClose()
      } catch {
        setError('Something went wrong.')
      }
    })
  }

  return (
    <Modal title="Pay Credit Card" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Current debt</p>
            <p className="text-lg font-bold text-rose-500">{formatVND(amountOwed)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Available credit</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{formatVND(Number(creditWallet.balance))}</p>
          </div>
        </div>

        <AmountInput
          label="Payment amount"
          name="amount"
          defaultValue={amountOwed}
          required
        />

        <CustomSelect
          label="Pay from"
          name="from_wallet_id"
          options={sourceOptions}
          value={fromId}
          onChange={setFromId}
          placeholder="Select wallet"
        />

        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Date" name="date" value={date} onChange={setDate} />
          <Input label="Note (optional)" name="note" placeholder="Credit card payment" />
        </div>

        {amountOwed <= 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No outstanding balance — credit is fully available.</p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending || amountOwed <= 0} fullWidth>
            {isPending ? 'Processing...' : 'Pay'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
