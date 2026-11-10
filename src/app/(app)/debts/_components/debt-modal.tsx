'use client'

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
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [type, setType] = useState<'lend' | 'borrow'>(editing?.type ?? defaultType)
  const [date, setDate] = useState(localYMD())
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [walletId, setWalletId] = useState(
    editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? ''
  )

  const walletOptions = toWalletOptions(wallets)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number(readField(form, 'amount'))
    const person_name = readField(form, 'person_name').trim()

    if (!person_name) { setError('Name is required.'); return }
    if (!editing && (!amount || amount <= 0)) { setError('Amount is required.'); return }

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
    <Modal title={editing ? 'Edit debt' : 'New debt'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <TabGroup
            tabs={[{ key: 'lend', label: '↑ I lent' }, { key: 'borrow', label: '↓ I borrowed' }]}
            value={type}
            onChange={setType}
            activeColors={{ lend: BRAND_HEX, borrow: BORROWED_HEX }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Person name" name="person_name" defaultValue={editing?.person_name ?? ''} required placeholder="e.g. Nguyen Van A" />
          <Input label="Contact (optional)" name="person_contact" defaultValue={editing?.person_contact ?? ''} placeholder="Phone / email" />
        </div>

        {!editing && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AmountInput label="Amount" name="amount" required />
              <CustomSelect label="Wallet" name="wallet_id" options={walletOptions} value={walletId} onChange={setWalletId} placeholder="None" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
              <DatePicker label="Due date (optional)" name="due_date" value={dueDate} onChange={setDueDate} />
            </div>
          </>
        )}

        {editing && (
          <DatePicker label="Due date (optional)" name="due_date" value={dueDate} onChange={setDueDate} />
        )}

        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="Purpose..." />

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
