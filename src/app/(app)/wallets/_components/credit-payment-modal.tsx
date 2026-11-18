'use client'
import { useTranslations } from 'next-intl'

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
import { readField } from '@/lib/utils/form'

interface CreditPaymentModalProps {
  creditWallet: Wallet
  wallets: Wallet[]
  onClose: () => void
}

export function CreditPaymentModal({ creditWallet, wallets, onClose }: CreditPaymentModalProps) {
  const t = useTranslations('wallets')
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
    const amount = Number(readField(form, 'amount'))
    const note = readField(form, 'note').trim()

    if (!amount || amount <= 0) { setError(t('enterAValidAmount')); return }
    if (!fromId) { setError(t('selectASourceWallet')); return }

    submit(async () => {
      await walletsApi.payCreditCard(creditWallet.id, { from_wallet_id: fromId, amount, note, date })
    })
  }

  return (
    <Modal title={t('payCreditCard')} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{t('currentDebt')}</p>
            <p className="text-lg font-bold text-rose-500">{formatVND(amountOwed)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">{t('availableCredit')}</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{formatVND(Number(creditWallet.balance))}</p>
          </div>
        </div>

        <AmountInput
          label={t('paymentAmount')}
          name="amount"
          defaultValue={amountOwed}
          required
        />

        <CustomSelect
          label={t('payFrom')}
          name="from_wallet_id"
          options={sourceOptions}
          value={fromId}
          onChange={setFromId}
          placeholder={t('selectWallet')}
        />

        <div className="grid grid-cols-2 gap-3">
          <DatePicker label={t('date')} name="date" value={date} onChange={setDate} />
          <Input label={t('noteOptional')} name="note" placeholder={t('creditCardPayment')} />
        </div>

        {amountOwed <= 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('noOutstandingBalanceCreditIsFullyAvailable')}</p>
        )}

        <FormError message={error} />

        <ModalActions
          isPending={isPending}
          disabled={amountOwed <= 0}
          submitLabel={t('pay')}
          pendingLabel="Processing..."
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
