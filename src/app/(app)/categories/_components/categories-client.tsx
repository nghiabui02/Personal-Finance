'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TabGroup } from '@/components/ui/tab-group'
import { type Category, categoriesApi } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CategoryCard } from './category-card'
import { CategoryModal } from './category-modal'

export default function CategoriesClient({
  categories,
  initialTab,
}: {
  categories: Category[]
  initialTab: 'income' | 'expense'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'income' | 'expense'>(initialTab)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await categoriesApi.delete(confirmId); router.refresh() }
      catch { /* add toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <TabGroup
          tabs={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]}
          value={tab}
          onChange={switchTab}
          className="w-fit"
        />
        <Button onClick={() => openModal()} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          New category
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={`No ${tab} categories yet.`}
          action={{ label: 'Create your first one', onClick: () => openModal() }}
        />
      ) : (
        <div className="space-y-6">
          {custom.length > 0 && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">Custom</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {custom.map(cat => (
                  <CategoryCard key={cat.id} category={cat}
                    onEdit={() => openModal(cat)} onDelete={() => setConfirmId(cat.id)}
                    isDeleting={isPending && confirmId === cat.id} />
                ))}
              </div>
            </section>
          )}
          {defaults.length > 0 && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">Default</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {defaults.map(cat => (
                  <CategoryCard key={cat.id} category={cat}
                    onEdit={() => openModal(cat)} onDelete={() => setConfirmId(cat.id)}
                    isDeleting={isPending && confirmId === cat.id} />
                ))}
              </div>
            </section>
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
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
