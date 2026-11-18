'use client'
import { useTranslations } from 'next-intl'

import { AmountInput } from '@/components/ui/amount-input'
import { CustomSelect } from '@/components/ui/custom-select'
import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Wallet, WALLET_TYPE_ICONS, walletsApi } from '@/lib/api/wallets'
import { useState } from 'react'
import { CATEGORY_PALETTE } from '@/lib/utils/colors'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField, readCheckbox } from '@/lib/utils/form'

const TYPE_ORDER: Wallet['type'][] = ['cash', 'bank', 'credit', 'e_wallet', 'investment', 'other']

const TYPE_OPTIONS = TYPE_ORDER.map(value => ({
  value,
  label: value,
  icon: WALLET_TYPE_ICONS[value],
}))

interface WalletModalProps {
  editing: Wallet | null
  onClose: () => void
}

function DaySelect({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number | null }) {
  const t = useTranslations('wallets')
  const options = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: t('dayNumber', { day: i + 1 }),
  }))
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <select
        name={name}
        defaultValue={String(defaultValue ?? 1)}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2.5 focus:outline-none focus:border-brand"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function WalletModal({ editing, onClose }: WalletModalProps) {
  const common = useTranslations('common')
  const t = useTranslations('wallets')
  const close = useModalClose()
  const { error, setError, isPending, submit } = useFormSubmit(onClose)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? CATEGORY_PALETTE[5])
  const [type, setType] = useState<Wallet['type']>(editing?.type ?? 'cash')

  const isCredit = type === 'credit'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget

    const name = readField(form, 'name').trim()
    const icon = readField(form, 'icon').trim()
    const is_default = readCheckbox(form, 'is_default')

    if (!name) { setError(t('nameIsRequired')); return }

    submit(async () => {
      if (editing) {
        await walletsApi.update(editing.id, { name, color: selectedColor })
      } else {
        const base = { name, type, icon: icon || undefined, color: selectedColor, is_default }
        const payload = isCredit
          ? {
              ...base,
              balance: 0,
              credit_limit: Number(readField(form, 'credit_limit')) || 0,
              statement_day: Number(readField(form, 'statement_day')) || 26,
              payment_due_day: Number(readField(form, 'payment_due_day')) || 10,
            }
          : { ...base, balance: Number(readField(form, 'balance')) || 0 }
        await walletsApi.create(payload)
      }
    })
  }

  return (
    <Modal title={editing ? t('editWallet') : t('newWallet')} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* What the wallet is. Name takes the extra width — a type is one word. */}
        <div className={editing ? '' : 'grid grid-cols-[3fr_2fr] gap-3 items-end'}>
          <Input
            label={t('name')}
            name="name"
            defaultValue={editing?.name ?? ''}
            required
            placeholder={isCredit ? t('eGVcbVisa') : t('eGVietcombank')}
          />
          {!editing && <CustomSelect
            label={t('type')}
            name="type"
            options={TYPE_OPTIONS.map(option => ({ ...option, label: common(`walletTypes.${option.value}`) }))}
            value={type}
            onChange={v => setType(v as Wallet['type'])}
          />}
        </div>

        {/* The money field beside the icon — both are short enough to share. */}
        {!editing && <div className="grid grid-cols-2 gap-3 items-end">
          {isCredit ? (
            <AmountInput
              label={t('creditLimit')}
              name="credit_limit"
              defaultValue={0}
              required
            />
          ) : (
            <AmountInput
              label={t('balance')}
              name="balance"
              defaultValue={0}
            />
          )}
          <EmojiPickerInput
            label={t('icon')}
            name="icon"
            defaultValue={''}
          />
        </div>}

        {!editing && isCredit && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <DaySelect label={t('statementDay')} name="statement_day" defaultValue={26} />
              <DaySelect label={t('paymentDueDay')} name="payment_due_day" defaultValue={10} />
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              {t('exampleStatementOnThe26thPaymentDueOnThe10thOfThe')}</p>
          </div>
        )}

        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('color')}</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${
                  selectedColor === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {!editing && <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={false}
            className="w-4 h-4 rounded border-gray-300 text-brand-fill focus:ring-brand"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('setAsDefaultWallet')}</span>
        </label>}

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
