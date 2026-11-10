'use client'

import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category, categoriesApi } from '@/lib/api/categories'
import { useState } from 'react'
import { CATEGORY_PALETTE } from '@/lib/utils/colors'
import { FormError } from '@/components/ui/form-error'
import { ModalActions } from '@/components/ui/modal-actions'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { readField } from '@/lib/utils/form'


interface CategoryModalProps {
  editing: Category | null
  activeTab: 'income' | 'expense'
  onClose: () => void
}

export function CategoryModal({ editing, activeTab, onClose }: CategoryModalProps) {
  const close = useModalClose()
  const { error, isPending, submit } = useFormSubmit(onClose)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? CATEGORY_PALETTE[0])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = readField(form, 'name').trim()
    const icon = readField(form, 'icon').trim()

    submit(async () => {
      if (editing) {
        await categoriesApi.update(editing.id, { name, icon: icon || undefined, color: selectedColor })
      } else {
        await categoriesApi.create({ name, icon: icon || undefined, color: selectedColor, type: activeTab })
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
            {CATEGORY_PALETTE.map(c => (
              <button key={c} type="button" onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${selectedColor === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

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
