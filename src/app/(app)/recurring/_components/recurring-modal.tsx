'use client'

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
import { toWalletOptions, type Wallet } from '@/lib/api/wallets'
import { type RecurringTransaction, FREQUENCY_LABELS, recurringApi } from '@/lib/api/recurring-transactions'
import { useState } from 'react'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'

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
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(editing?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(editing?.start_date ?? localYMD())
  const [endDate, setEndDate] = useState(editing?.end_date ?? '')
  const [showFee, setShowFee] = useState(Number(editing?.bank_fee) > 0)

  const walletOptions = toWalletOptions(wallets)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const getValue = (n: string) => (form.elements.namedItem(n) as HTMLInputElement)?.value ?? ''
    const amount = Number(getValue('amount'))
    // frequency comes from state, not form input
    const note = getValue('note')
    const fee = showFee ? Number(getValue('fee') || '0') : 0

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (!startDate) { setError('Start date is required.'); return }

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
    <Modal title={editing ? 'Edit recurring' : 'New recurring transaction'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        {!editing && (
          <TabGroup
            tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
            value={txType}
            onChange={t => { setTxType(t); setCategoryId('') }}
            activeColors={{ expense: MONEY_OUT, income: MONEY_IN }}
          />
        )}

        {/* Amount + Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Amount" name="amount" defaultValue={editing?.amount} required />
          <CustomSelect
            label="Repeat"
            name="frequency"
            options={Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={frequency}
            onChange={v => setFrequency(v as RecurringTransaction['frequency'])}
          />
        </div>

        {/* Category + Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <CategorySelect
            categories={categories} filterType={txType}
            value={categoryId} onChange={setCategoryId} searchable />
          {wallets.length > 0
            ? <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
            : <div />}
        </div>

        {/* Start + End date */}
        {!editing ? (
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Start date" name="start_date" value={startDate} onChange={setStartDate} required />
            <DatePicker label="End date (optional)" name="end_date" value={endDate} onChange={setEndDate} />
          </div>
        ) : (
          <DatePicker label="End date (optional)" name="end_date" value={endDate} onChange={setEndDate} />
        )}

        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="e.g. Netflix subscription" />

        {/* Bank fee — persisted on the rule, then folded into every generated
            transaction (amount + fee), same as the transaction modal */}
        {txType === 'expense' && !!walletId && (
          <BankFeeField isOpen={showFee} onOpenChange={setShowFee} defaultValue={editing?.bank_fee ?? 0}>
            Included in each generated transaction — the total charged will be amount + fee.
          </BankFeeField>
        )}

        <FormError message={error} />
        <ModalActions
          isPending={isPending}
          submitLabel="Save"
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
