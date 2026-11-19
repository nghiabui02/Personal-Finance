'use client'
import { getCategoryName, sortCategories } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Em } from '@/components/ui/verdict'
import { Modal } from '@/components/ui/modal'
import { TabGroup } from '@/components/ui/tab-group'
import { AddButton } from '@/components/ui/add-button'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/toast'
import { type Category, categoriesApi } from '@/lib/api/categories'
import { CategoryCard } from './category-card'
import { CategoryModal } from './category-modal'

export type CategoryDependency = { id: string; user_category_id: string | null; label: string; href: string }

export default function CategoriesClient({ categories, initialTab, dependencies }: {
  categories: Category[]
  initialTab: 'income' | 'expense'
  dependencies: CategoryDependency[]
}) {
  const locale = useLocale()
  const t = useTranslations('categories')
  const router = useRouter()
  const [tab, setTab] = useState(initialTab)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  const filtered = sortCategories(categories, locale).filter(category => category.type === tab)
  const active = filtered.filter(category => category.is_active)
  const removed = filtered.filter(category => !category.is_active)
  const blockers = dependencies.filter(row => row.user_category_id === removing?.id)

  function openModal(category: Category | null = null) {
    setEditingCategory(category)
    setModalOpen(true)
  }

  function changeState(category: Category, isActive: boolean) {
    startTransition(async () => {
      try {
        await (isActive ? categoriesApi.restore(category.id) : categoriesApi.remove(category.id))
        setRemoving(null)
        router.refresh()
      } catch (error) {
        toastError(error, t('couldNotChangeCategoryState'))
        router.refresh()
      }
    })
  }

  return (
    <>
      <ScreenHeader eyebrow={t('account')}
        headline={<>{t.rich('activeCount', { count: active.length, strong: chunks => <Em>{chunks}</Em> })}</>}
        controls={<TabGroup tabs={[{ key: 'expense', label: t('expense') }, { key: 'income', label: t('income') }]} value={tab}
          onChange={value => { setTab(value); router.replace(`/categories?type=${value}`, { scroll: false }) }} className="w-fit" />}
        action={<div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/categories/store')}>{t('browseStore')}</Button>
          <AddButton onClick={() => openModal()}>{t('newCategory')}</AddButton>
        </div>} />
      {!active.length && <EmptyState message={t('emptyType', { type: tab })}
        action={{ label: t('browseStore'), onClick: () => router.push('/categories/store') }}
        secondaryAction={{ label: t('createYourFirstOne'), onClick: () => openModal() }} />}
      <div className="space-y-6">
        {[
          { title: t('custom'), list: active.filter(category => !category.category_id && !category.system_key) },
          { title: t('fromStore'), list: active.filter(category => category.category_id) },
          { title: t('internal'), list: active.filter(category => category.system_key) },
        ].map(({ title, list }) => list.length > 0 && <section key={title}>
          <h2 className="eyebrow text-gray-400 mb-3">{title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {list.map(category => <CategoryCard key={category.id} category={category} onEdit={() => openModal(category)}
              onDelete={() => setRemoving(category)} isDeleting={isPending} />)}
          </div>
        </section>)}
        {removed.length > 0 && <details>
          <summary className="cursor-pointer text-sm text-gray-500 mb-3">{t('removedCount', { count: removed.length })}</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {removed.map(category => <CategoryCard key={category.id} category={category} onEdit={() => openModal(category)}
              onDelete={() => changeState(category, true)} isDeleting={isPending} />)}
          </div>
        </details>}
      </div>
      {modalOpen && <CategoryModal key={editingCategory?.id ?? 'new'} editing={editingCategory} activeTab={tab}
        onClose={() => { setModalOpen(false); setEditingCategory(null) }} />}
      {removing && <Modal title={t('removeNamedCategory', { name: getCategoryName(removing, locale) })} onClose={() => setRemoving(null)}>
        <p className="text-sm text-gray-500">{blockers.length ? t('categoryDependencies') : t('removeKeepsHistory')}</p>
        {blockers.length > 0 && <ul className="mt-3 space-y-2">
          {blockers.map(row => <li key={row.id}><Link href={row.href} className="text-sm text-brand underline">{row.label}</Link></li>)}
        </ul>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoving(null)} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={() => changeState(removing, false)} disabled={isPending || blockers.length > 0}>{t('removeCategory')}</Button>
        </div>
      </Modal>}
    </>
  )
}
