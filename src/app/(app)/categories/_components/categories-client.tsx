'use client'

import { Button } from '@/components/ui/button'
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
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'income' | 'expense'>(initialTab)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      try { await categoriesApi.delete(id); router.refresh() }
      catch { /* add toast later */ }
      finally { setDeletingId(null) }
    })
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Categories</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage your income and expense categories</p>
        </div>
        <Button onClick={() => openModal()} className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          New category
        </Button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No {tab} categories yet.</p>
          <button onClick={() => openModal()} className="mt-2 text-sm text-blue-600 hover:underline">
            Create your first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {custom.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Custom</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {custom.map(cat => (
                  <CategoryCard key={cat.id} category={cat}
                    onEdit={() => openModal(cat)} onDelete={() => handleDelete(cat.id)}
                    isDeleting={deletingId === cat.id} />
                ))}
              </div>
            </section>
          )}
          {defaults.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Default</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {defaults.map(cat => (
                  <CategoryCard key={cat.id} category={cat}
                    onEdit={() => openModal(cat)} onDelete={() => handleDelete(cat.id)}
                    isDeleting={deletingId === cat.id} />
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
    </>
  )
}
