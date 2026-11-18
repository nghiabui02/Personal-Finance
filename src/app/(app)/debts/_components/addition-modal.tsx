'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { Modal, useModalClose } from '@/components/ui/modal'
import { AmountInput } from '@/components/ui/amount-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { debtsApi, type Debt } from '@/lib/api/debts'
import { toWalletOptions, type WalletChoice } from '@/lib/api/wallets'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField } from '@/lib/utils/form'

// Records more money lent/borrowed against an existing debt — increases
// remaining_amount. Shared between the debts list page and the debt detail
// page so "add more" only has one implementation to keep in sync.
export function AdditionModal({
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
  const [date, setDate] = useState(localYMD())
  const [walletId, setWalletId] = useState(debt.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [amount, setAmount] = useState(0)

  const walletOptions = toWalletOptions(wallets, t('none'))

  const remainingAfter = debt.remaining_amount + amount

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const note = readField(form, 'note')
    if (!amount || amount <= 0) { setError(t('pleaseEnterAValidAmount')); return }
    submit(async () => {
      await debtsApi.addDebt(debt.id, { amount, note: note || undefined, date, wallet_id: walletId || undefined })
    })
  }

  const walletLabel = debt.type === 'lend' ? t('lendFromWallet') : t('receiveToWallet')

  return (
    <Modal title={t('addToDebt')} onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">{t('currentRemaining')}</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatVND(debt.remaining_amount)}</p>
        </div>
        {amount > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">{t('afterThisAddition')}</p>
            <p className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatVND(remainingAfter)}</p>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label={t('amountToAdd')} name="amount" required onValueChange={setAmount} />
          <CustomSelect label={walletLabel} name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder={t('none')} />
        </div>
        <DatePicker label={t('date')} name="date" value={date} onChange={setDate} required />
        <Input label={t('noteOptional')} name="note" placeholder={t('eGDinnerAtPizzaHut')} />
        <FormError message={error} />
        <ModalActions
          isPending={isPending}
          submitLabel={t('add2')}
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
