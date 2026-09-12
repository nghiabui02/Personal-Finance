'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Wallet, WALLET_TYPE_ICONS, WALLET_TYPE_LABELS, walletsApi } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
]

const TYPE_ORDER: Wallet['type'][] = ['cash', 'bank', 'credit', 'e_wallet', 'investment', 'other']

const TYPE_OPTIONS = TYPE_ORDER.map(value => ({
  value,
  label: WALLET_TYPE_LABELS[value],
  icon: WALLET_TYPE_ICONS[value],
}))

interface WalletModalProps {
  editing: Wallet | null
  onClose: () => void
}

function DaySelect({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number | null }) {
  const options = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `Day ${i + 1}`,
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
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? PRESET_COLORS[5])
  const [type, setType] = useState<Wallet['type']>(editing?.type ?? 'cash')

  const isCredit = type === 'credit'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement)?.value ?? ''

    const name = get('name').trim()
    const icon = get('icon').trim()
    const is_default = (form.elements.namedItem('is_default') as HTMLInputElement)?.checked ?? false

    if (!name) { setError('Name is required.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const base = { name, type, icon: icon || undefined, color: selectedColor, is_default }

        const payload = isCredit
          ? {
              ...base,
              balance: 0,
              credit_limit: Number(get('credit_limit')) || 0,
              statement_day: Number(get('statement_day')) || 26,
              payment_due_day: Number(get('payment_due_day')) || 10,
            }
          : { ...base, balance: Number(get('balance')) || 0 }

        if (editing) {
          await walletsApi.update(editing.id, payload)
        } else {
          await walletsApi.create(payload)
        }
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={editing ? 'Edit wallet' : 'New wallet'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          name="name"
          defaultValue={editing?.name ?? ''}
          required
          placeholder={isCredit ? 'e.g. Vietcombank Visa' : 'e.g. Vietcombank'}
        />

        <CustomSelect
          label="Type"
          name="type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={v => setType(v as Wallet['type'])}
        />

        {isCredit ? (
          <>
            <AmountInput
              label="Credit Limit"
              name="credit_limit"
              defaultValue={editing?.credit_limit ?? 0}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <DaySelect label="Statement Day" name="statement_day" defaultValue={editing?.statement_day ?? 26} />
              <DaySelect label="Payment Due Day" name="payment_due_day" defaultValue={editing?.payment_due_day ?? 10} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
              Example: statement on the 26th, payment due on the 10th of the next month
            </p>
          </>
        ) : (
          <AmountInput
            label="Balance"
            name="balance"
            defaultValue={editing?.balance ?? 0}
          />
        )}

        <EmojiPickerInput
          label="Icon"
          name="icon"
          defaultValue={editing?.icon ?? ''}
        />

        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
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

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={editing?.is_default ?? false}
            className="w-4 h-4 rounded border-gray-300 text-brand-fill focus:ring-brand"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Set as default wallet</span>
        </label>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
