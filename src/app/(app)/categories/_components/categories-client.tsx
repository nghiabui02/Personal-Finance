'use client'

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
  const router = useRouter()
  const [tab, setTab] = useState<'income' | 'expense'>(initialTab)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => categoriesApi.delete(id), 'Could not delete the category.',
  )

  const confirmCategory = categories.find(c => c.id === confirmId)

  const filtered = categories.filter(c => c.type === tab)
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
        eyebrow="Account"
        headline={
          custom.length === 0
            ? <>You&rsquo;re using the <Em>{filtered.length}</Em> built-in {tab} categories.</>
            : <>You&rsquo;ve added <Em>{custom.length}</Em> {tab} categor{custom.length === 1 ? 'y' : 'ies'} of your own.</>
        }
        support={<span>{filtered.length} in total</span>}
        controls={
          <TabGroup
            tabs={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]}
            value={tab}
            onChange={switchTab}
            className="w-fit"
          />
        }
        action={
          <AddButton onClick={() => openModal()}>New category</AddButton>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          message={`No ${tab} categories yet.`}
          action={{ label: 'Create your first one', onClick: () => openModal() }}
        />
      ) : (
        <div className="space-y-6">
          {[{ title: 'Custom', list: custom }, { title: 'Default', list: defaults }].map(({ title, list }) =>
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
          title={`Delete "${confirmCategory?.name}"?`}
          description="This category will be permanently deleted. Transactions using it will become uncategorized."
          confirmLabel="Delete category"
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel}
        />
      )}
    </>
  )
}
