'use client'
import { getCategoryName } from '@/i18n/category'
import { sortCategories } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { EmptyState } from '@/components/ui/empty-state'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Em } from '@/components/ui/verdict'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TabGroup } from '@/components/ui/tab-group'
import { type Category, categoriesApi } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CategoryCard } from './category-card'
import { CategoryModal } from './category-modal'
import { useDeleteConfirmation } from '@/lib/hooks/use-delete-confirmation'
import { AddButton } from '@/components/ui/add-button'

export default function CategoriesClient({
  categories,
  initialTab,
}: {
  categories: Category[]
  initialTab: 'income' | 'expense'
}) {
  const locale = useLocale()
  const t = useTranslations('categories')
  const router = useRouter()
  const [tab, setTab] = useState<'income' | 'expense'>(initialTab)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => categoriesApi.delete(id), t('couldNotDeleteTheCategory'),
  )

  const confirmCategory = categories.find(c => c.id === confirmId)

  const filtered = sortCategories(categories, locale).filter(c => c.type === tab)
  const defaults = filtered.filter(c => c.user_id === null)
  const custom = filtered.filter(c => c.user_id !== null)

  function switchTab(t: 'income' | 'expense') {
    setTab(t)
    router.replace(`/categories?type=${t}`, { scroll: false })
  }

  function openModal(category: Category | null = null) {
    setEditingCategory(category)
    setModalOpen(true)
  }

  return (
    <>
      <ScreenHeader
        eyebrow={t('account')}
        headline={
          custom.length === 0
            ? <>{t.rich('usingDefaults', { count: filtered.length, type: tab, strong: chunks => <Em>{chunks}</Em> })}</>
            : <>{t.rich('customCount', { count: custom.length, type: tab, strong: chunks => <Em>{chunks}</Em> })}</>
        }
        support={<span>{t('sentenceInTotal', { value0: filtered.length })}</span>}
        controls={
          <TabGroup
            tabs={[{ key: 'expense', label: t('expense') }, { key: 'income', label: t('income') }]}
            value={tab}
            onChange={switchTab}
            className="w-fit"
          />
        }
        action={
          <AddButton onClick={() => openModal()}>{t('newCategory')}</AddButton>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          message={t('emptyType', { type: tab })}
          action={{ label: t('createYourFirstOne'), onClick: () => openModal() }}
        />
      ) : (
        <div className="space-y-6">
          {[{ title: t('custom'), list: custom }, { title: t('default'), list: defaults }].map(({ title, list }) =>
            list.length > 0 && (
              <section key={title}>
                <p className="eyebrow text-gray-400 dark:text-gray-500 mb-3">{title}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {list.map(cat => (
                    <CategoryCard key={cat.id} category={cat}
                      onEdit={() => openModal(cat)} onDelete={() => ask(cat.id)}
                      isDeleting={isPending && confirmId === cat.id} />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {modalOpen && (
        <CategoryModal key={editingCategory?.id ?? 'new'} editing={editingCategory}
          activeTab={tab} onClose={() => { setModalOpen(false); setEditingCategory(null) }} />
      )}

      {confirmId && (
        <ConfirmModal
          title={t('deleteNamedCategory', { name: confirmCategory ? getCategoryName(confirmCategory, locale) : '' })}
          description={t('thisCategoryWillBePermanentlyDeletedTransactionsUsingItWillBecomeUncategorized')}
          confirmLabel={t('deleteCategory')}
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel}
        />
      )}
    </>
  )
}
