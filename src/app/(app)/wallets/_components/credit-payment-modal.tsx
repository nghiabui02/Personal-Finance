'use client'

import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { CustomSelect } from '@/components/ui/custom-select'
import { AmountInput } from '@/components/ui/amount-input'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet, walletsApi } from '@/lib/api/wallets'
import { localYMD } from '@/lib/utils/date'
import { useState } from 'react'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'

interface CreditPaymentModalProps {
  creditWallet: Wallet
  wallets: Wallet[]
  onClose: () => void
}

export function CreditPaymentModal({ creditWallet, wallets, onClose }: CreditPaymentModalProps) {
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
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

    submit(async () => {
      await walletsApi.payCreditCard(creditWallet.id, { from_wallet_id: fromId, amount, note, date })
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

        <FormError message={error} />

        <ModalActions
          isPending={isPending}
          disabled={amountOwed <= 0}
          submitLabel="Pay"
          pendingLabel="Processing..."
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
