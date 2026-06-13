import { type Category } from '@/lib/api/categories'

interface CategoryCardProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function CategoryCard({ category, onEdit, onDelete, isDeleting }: CategoryCardProps) {
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
