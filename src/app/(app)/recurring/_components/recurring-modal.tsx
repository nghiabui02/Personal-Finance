'use client'
import { useTranslations } from 'next-intl'

import { AmountInput } from '@/components/ui/amount-input'
import { BankFeeField } from '@/components/ui/bank-fee-field'
import { MONEY_IN, MONEY_OUT } from '@/lib/utils/colors'
import { CategorySelect } from '@/components/ui/category-select'
import { TabGroup } from '@/components/ui/tab-group'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { localYMD } from '@/lib/utils/date'
import { type Category } from '@/lib/api/categories'
import { isDebtCategoryKey } from '@/lib/constants'
import { toWalletOptions, type Wallet } from '@/lib/api/wallets'
import { type RecurringTransaction, recurringApi } from '@/lib/api/recurring-transactions'
import { useState } from 'react'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField } from '@/lib/utils/form'

/** Creates a recurring rule, or edits the amount, schedule and details of one. */
export function RecurringModal({
  editing,
  categories,
  wallets,
  onClose,
}: {
  editing: RecurringTransaction | null
  categories: Category[]
  wallets: Wallet[]
  onClose: () => void
}) {
  const common = useTranslations('common')
  const t = useTranslations('recurring')
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(editing?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(editing?.start_date ?? localYMD())
  const [endDate, setEndDate] = useState(editing?.end_date ?? '')
  const [showFee, setShowFee] = useState(Number(editing?.bank_fee) > 0)

  const walletOptions = toWalletOptions(wallets, t('none'))
  // The nightly job files a rule's transactions without a debt, so a debt
  // category is not offered. A rule keeps the category it already has.
  const choosableCategories = categories.filter(
    c => c.id === editing?.category_id || !isDebtCategoryKey(c.system_key),
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number(readField(form, 'amount'))
    // frequency comes from state, not form input
    const note = readField(form, 'note')
    const fee = showFee ? Number(readField(form, 'fee') || '0') : 0

    if (!amount || amount <= 0) { setError(t('pleaseEnterAValidAmount')); return }
    if (!startDate) { setError(t('startDateIsRequired')); return }

    submit(async () => {
      if (editing) {
        await recurringApi.update(editing.id, {
          amount, frequency,
          category_id: categoryId || undefined,
          wallet_id: walletId || undefined,
          note: note || undefined,
          end_date: endDate || undefined,
          bank_fee: fee > 0 ? fee : null,
        })
      } else {
        await recurringApi.create({
          type: txType, amount, frequency, start_date: startDate,
          category_id: categoryId || undefined,
          wallet_id: walletId || undefined,
          note: note || undefined,
          end_date: endDate || undefined,
          bank_fee: fee > 0 ? fee : undefined,
        })
      }
    })
  }

  return (
    <Modal title={editing ? t('editRecurring') : t('newRecurringTransaction')} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        {!editing && (
          <TabGroup
            tabs={[{ key: 'expense', label: t('expense') }, { key: 'income', label: t('income') }]}
            value={txType}
            onChange={t => { setTxType(t); setCategoryId('') }}
            activeColors={{ expense: MONEY_OUT, income: MONEY_IN }}
          />
        )}

        {/* Amount + Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label={t('amount')} name="amount" defaultValue={editing?.amount} required />
          <CustomSelect
            label={t('repeat')}
            name="frequency"
            options={(['daily', 'weekly', 'monthly', 'yearly'] as const).map(value => ({ value, label: common(`frequencies.${value}`) }))}
            value={frequency}
            onChange={v => setFrequency(v as RecurringTransaction['frequency'])}
          />
        </div>

        {/* Category + Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <CategorySelect
            categories={choosableCategories} filterType={txType}
            value={categoryId} onChange={setCategoryId} searchable />
          {wallets.length > 0
            ? <CustomSelect label={t('wallet')} name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder={t('none')} />
            : <div />}
        </div>

        {/* Start + End date */}
        {!editing ? (
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label={t('startDate')} name="start_date" value={startDate} onChange={setStartDate} required />
            <DatePicker label={t('endDateOptional')} name="end_date" value={endDate} onChange={setEndDate} />
          </div>
        ) : (
          <DatePicker label={t('endDateOptional')} name="end_date" value={endDate} onChange={setEndDate} />
        )}

        <Input label={t('noteOptional')} name="note" defaultValue={editing?.note ?? ''} placeholder={t('eGNetflixSubscription')} />

        {/* Bank fee — persisted on the rule, then folded into every generated
            transaction (amount + fee), same as the transaction modal */}
        {txType === 'expense' && !!walletId && (
          <BankFeeField isOpen={showFee} onOpenChange={setShowFee} defaultValue={editing?.bank_fee ?? 0}>
            {t('includedInEachGeneratedTransactionTheTotalChargedWillBeAmountFee')}</BankFeeField>
        )}

        <FormError message={error} />
        <ModalActions
          isPending={isPending}
          submitLabel={t('save')}
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
