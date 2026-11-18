'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { AmountInput } from '@/components/ui/amount-input'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { ModalActions } from '@/components/ui/modal-actions'
import { TabGroup } from '@/components/ui/tab-group'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { toWalletOptions, type WalletChoice } from '@/lib/api/wallets'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { localYMD } from '@/lib/utils/date'
import { BRAND_HEX } from '@/lib/utils/colors'
import { BORROWED_HEX } from './debt-presentation'
import { readField } from '@/lib/utils/form'

/** Creates a debt, or edits the person, contact, due date and note of one. */
export function DebtModal({
  editing,
  defaultType = 'lend',
  wallets,
  onClose,
}: {
  editing: Debt | null
  defaultType?: 'lend' | 'borrow'
  wallets: WalletChoice[]
  onClose: () => void
}) {
  const t = useTranslations('debts')
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [type, setType] = useState<'lend' | 'borrow'>(editing?.type ?? defaultType)
  const [date, setDate] = useState(localYMD())
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [walletId, setWalletId] = useState(
    editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? ''
  )

  const walletOptions = toWalletOptions(wallets, t('none'))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number(readField(form, 'amount'))
    const person_name = readField(form, 'person_name').trim()

    if (!person_name) { setError(t('nameIsRequired')); return }
    if (!editing && (!amount || amount <= 0)) { setError(t('amountIsRequired')); return }

    submit(async () => {
      if (editing) {
        await debtsApi.update(editing.id, {
          person_name,
          person_contact: readField(form, 'person_contact') || undefined,
          due_date: dueDate || undefined,
          note: readField(form, 'note') || undefined,
        })
      } else {
        await debtsApi.create({
          type,
          person_name,
          person_contact: readField(form, 'person_contact') || undefined,
          amount,
          wallet_id: walletId || undefined,
          date,
          due_date: dueDate || undefined,
          note: readField(form, 'note') || undefined,
        })
      }
    })
  }

  return (
    <Modal title={editing ? t('editDebt') : t('newDebt')} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <TabGroup
            tabs={[{ key: 'lend', label: t('iLent') }, { key: 'borrow', label: t('iBorrowed') }]}
            value={type}
            onChange={setType}
            activeColors={{ lend: BRAND_HEX, borrow: BORROWED_HEX }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('personName')} name="person_name" defaultValue={editing?.person_name ?? ''} required placeholder={t('eGNguyenVanA')} />
          <Input label={t('contactOptional')} name="person_contact" defaultValue={editing?.person_contact ?? ''} placeholder={t('phoneEmail')} />
        </div>

        {!editing && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AmountInput label={t('amount')} name="amount" required />
              <CustomSelect label={t('wallet')} name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder={t('none')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label={t('date')} name="date" value={date} onChange={setDate} required />
              <DatePicker label={t('dueDateOptional')} name="due_date" value={dueDate} onChange={setDueDate} />
            </div>
          </>
        )}

        {editing && (
          <DatePicker label={t('dueDateOptional')} name="due_date" value={dueDate} onChange={setDueDate} />
        )}

        <Input label={t('noteOptional')} name="note" defaultValue={editing?.note ?? ''} placeholder={t('purpose')} />

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
