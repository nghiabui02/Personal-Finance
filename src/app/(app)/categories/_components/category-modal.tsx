'use client'

import { Button } from '@/components/ui/button'
import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category, categoriesApi } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
]

interface CategoryModalProps {
  editing: Category | null
  activeTab: 'income' | 'expense'
  onClose: () => void
}

export function CategoryModal({ editing, activeTab, onClose }: CategoryModalProps) {
  const router = useRouter()
  const close = useModalClose()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? PRESET_COLORS[0])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const icon = (form.elements.namedItem('icon') as HTMLInputElement).value.trim()

    setError(null)
    startTransition(async () => {
      try {
        if (editing) {
          await categoriesApi.update(editing.id, { name, icon: icon || undefined, color: selectedColor })
        } else {
          await categoriesApi.create({ name, icon: icon || undefined, color: selectedColor, type: activeTab })
        }
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={editing ? 'Edit category' : 'New category'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <EmojiPickerInput label="Icon" name="icon" defaultValue={editing?.icon ?? ''} />
        <Input label="Name" name="name" defaultValue={editing?.name ?? ''} required
          placeholder={activeTab === 'expense' ? 'e.g. Food & Drinks' : 'e.g. Salary'} />

        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${selectedColor === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

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
