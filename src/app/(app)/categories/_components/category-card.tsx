import { type Category } from '@/lib/api/categories'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'

interface CategoryCardProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function CategoryCard({ category, onEdit, onDelete, isDeleting }: CategoryCardProps) {
  const isOwned = category.user_id !== null

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3.5 border border-hairline hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
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
          <IconButton label="Edit category" onClick={onEdit}>{EditIcon}</IconButton>
          <IconButton label="Delete category" onClick={onDelete} disabled={isDeleting} tone="danger">{TrashIcon}</IconButton>
        </div>
      )}
    </div>
  )
}
