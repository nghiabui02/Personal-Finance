'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Wallet, WALLET_TYPE_LABELS, walletsApi } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
]

const TYPE_ICONS: Record<Wallet['type'], string> = {
  cash: '💵',
  bank: '🏦',
  e_wallet: '📱',
  investment: '📈',
  other: '💼',
}

const TYPE_OPTIONS = (Object.entries(WALLET_TYPE_LABELS) as [Wallet['type'], string][]).map(
  ([value, label]) => ({ value, label, icon: TYPE_ICONS[value] })
)

interface WalletModalProps {
  editing: Wallet | null
  onClose: () => void
}

export function WalletModal({ editing, onClose }: WalletModalProps) {
  const router = useRouter()
  const close = useModalClose()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? PRESET_COLORS[2])
  const [type, setType] = useState<Wallet['type']>(editing?.type ?? 'cash')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const balance = Number((form.elements.namedItem('balance') as HTMLInputElement).value)
    const icon = (form.elements.namedItem('icon') as HTMLInputElement).value.trim()
    const is_default = (form.elements.namedItem('is_default') as HTMLInputElement).checked

    setError(null)
    startTransition(async () => {
      try {
        const payload = { name, type, balance, icon: icon || undefined, color: selectedColor, is_default }
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
    <Modal title={editing ? 'Edit wallet' : 'New wallet'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          name="name"
          defaultValue={editing?.name ?? ''}
          required
          placeholder="e.g. Vietcombank"
        />

        <CustomSelect
          label="Type"
          name="type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={v => setType(v as Wallet['type'])}
        />

        <AmountInput
          label="Balance"
          name="balance"
          defaultValue={editing?.balance ?? 0}
          required
        />

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
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Set as default wallet</span>
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
