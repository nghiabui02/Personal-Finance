'use client'
import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

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
  const t = useTranslations('categories')
  const locale = useLocale()
  const close = useModalClose()
  const { error, isPending, submit } = useFormSubmit(onClose)
  const [selectedColor, setSelectedColor] = useState(editing?.color ?? CATEGORY_PALETTE[0])
  const [nameEdited, setNameEdited] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const name = readField(form, 'name').trim()
    // An explicit rename survives language changes, even when the text matches today's label.
    const icon = readField(form, 'icon').trim()

    submit(async () => {
      if (editing) {
        await categoriesApi.update(editing.id, { ...(nameEdited ? { name } : {}), icon, color: selectedColor })
      } else {
        await categoriesApi.create({ name, icon: icon || undefined, color: selectedColor, type: activeTab })
      }
    })
  }

  return (
    <Modal title={editing ? t('editCategory') : t('newCategory')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <EmojiPickerInput label={t('icon')} name="icon" defaultValue={editing?.icon ?? ''} />
        <Input label={t('name')} name="name" defaultValue={editing ? getCategoryName(editing, locale) : ''} required onChange={() => setNameEdited(true)}
          placeholder={activeTab === 'expense' ? t('eGFoodDrinks') : t('eGSalary')} />

        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('color')}</p>
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
          submitLabel={t('save')}
          onCancel={close}
        />
      </form>
    </Modal>
  )
}
