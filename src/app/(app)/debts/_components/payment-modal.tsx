'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { AmountInput } from '@/components/ui/amount-input'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { toWalletOptions, type WalletChoice } from '@/lib/api/wallets'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField } from '@/lib/utils/form'

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
  const t = useTranslations('debts')
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [date, setDate] = useState(localYMD())
  const [amount, setAmount] = useState(0)

  const walletOptions = toWalletOptions(wallets, t('none'))

  const overpaying = amount > debt.remaining_amount
  const remainingAfter = Math.max(0, debt.remaining_amount - amount)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const note = readField(form, 'note')

    if (!amount || amount <= 0) { setError(t('pleaseEnterAValidAmount')); return }
    if (amount > debt.remaining_amount) { setError(t('maximumAmount', { amount: formatVND(debt.remaining_amount) })); return }

    submit(async () => {
      await debtsApi.addPayment(debt.id, { amount, note: note || undefined, wallet_id: walletId || undefined, date })
    })
  }

  return (
    <Modal title={t('recordPayment')} onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{t('remaining')}</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
        </div>
        {amount > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">{t('afterThisPayment')}</p>
            <p className={`font-semibold tabular-nums ${
              overpaying ? 'text-rose-600 dark:text-rose-400' : remainingAfter === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {overpaying ? t('exceedsRemaining') : formatVND(remainingAfter)}
            </p>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label={t('paymentAmount')} name="amount" required onValueChange={setAmount} />
          <CustomSelect
            label={debt.type === 'lend' ? t('receiveToWallet') : t('payFromWallet')}
            name="wallet_id"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder={t('none')}
          />
        </div>
        <DatePicker label={t('date')} name="date" value={date} onChange={setDate} required />
        <Input label={t('noteOptional')} name="note" placeholder={t('eGBankTransfer')} />
        <FormError message={error} />
        <ModalActions
          isPending={isPending}
          submitLabel={t('record')}
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
