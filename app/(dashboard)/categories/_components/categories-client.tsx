'use client'

import { type Category, categoriesApi } from '@/lib/api/categories'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6',
]

function CategoryModal({
  editing,
  activeTab,
  onClose,
}: {
  editing: Category | null
  activeTab: 'income' | 'expense'
  onClose: () => void
}) {
  const router = useRouter()
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
          {editing ? 'Edit category' : 'New category'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon <span className="font-normal text-gray-400">(emoji)</span>
            </label>
            <input
              name="icon"
              defaultValue={editing?.icon ?? ''}
              placeholder={activeTab === 'expense' ? '🍔' : '💼'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              name="name"
              defaultValue={editing?.name ?? ''}
              required
              placeholder={activeTab === 'expense' ? 'e.g. Food & Drinks' : 'e.g. Salary'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
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

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
  isDeleting,
}: {
  category: Category
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const isOwned = category.user_id !== null

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl px-4 py-3.5 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
        style={{ backgroundColor: category.color ? `${category.color}22` : '#f3f4f6' }}
      >
        {category.icon ? (
          <span>{category.icon}</span>
        ) : (
          <span className="text-sm font-semibold" style={{ color: category.color ?? '#6b7280' }}>
            {category.name[0].toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{category.name}</p>
        {!isOwned && <p className="text-xs text-gray-400">Default</p>}
      </div>

      {category.color && (
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
      )}

      {isOwned && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

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

  function openCreate() {
    setEditingCategory(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingCategory(null)
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      try {
        await categoriesApi.delete(id)
        router.refresh()
      } catch {
        // silently ignore — could add a toast here later
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Categories</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage your income and expense categories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New category
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-400 text-sm">No {tab} categories yet.</p>
          <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">
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
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => handleDelete(cat.id)}
                    isDeleting={deletingId === cat.id}
                  />
                ))}
              </div>
            </section>
          )}

          {defaults.length > 0 && (
            <section>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Default</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {defaults.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => handleDelete(cat.id)}
                    isDeleting={deletingId === cat.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {modalOpen && (
        <CategoryModal
          key={editingCategory?.id ?? 'new'}
          editing={editingCategory}
          activeTab={tab}
          onClose={closeModal}
        />
      )}
    </>
  )
}
