'use client'

import { CategorySelect } from '@/components/ui/category-select'
import { type Category } from '@/lib/api/categories'
import { keepFocus } from './centered-amount-input'

const TILE = 'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition-colors'

/** Rose for a spend, green for income when chosen; plain otherwise. */
function tileTone(selected: boolean, txType: 'income' | 'expense'): string {
  if (!selected) {
    return 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-gray-600'
  }
  return txType === 'expense'
    ? 'border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/30'
    : 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
}

/**
 * The first few categories of the current direction as tiles, a "More" tile
 * that opens the full list, and the category the history suggests.
 */
export function CategoryTiles({
  categories,
  txType,
  categoryId,
  suggestedCategory,
  moreOpen,
  onToggleMore,
  onChange,
}: {
  categories: Category[]
  txType: 'income' | 'expense'
  categoryId: string
  suggestedCategory: Category | null
  moreOpen: boolean
  onToggleMore: () => void
  onChange: (id: string) => void
}) {
  const selectedCat = categories.find(c => c.id === categoryId)
  const visibleCategories = categories.filter(c => c.type === txType).slice(0, 3)
  const selectedInGrid = visibleCategories.some(c => c.id === categoryId)
  // A category picked from the full list has no tile of its own; "More" shows it instead.
  const overflowSelected = !selectedInGrid && selectedCat ? selectedCat : null

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</p>
      <div className="grid grid-cols-4 gap-2">
        {visibleCategories.map(c => {
          const active = c.id === categoryId
          return (
            <button
              key={c.id}
              type="button"
              onMouseDown={keepFocus}
              onClick={() => onChange(active ? '' : c.id)}
              className={`${TILE} ${tileTone(active, txType)}`}
            >
              <span className="text-xl leading-none">{c.icon ?? '🏷️'}</span>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate w-full text-center">
                {c.name}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onToggleMore}
          className={`${TILE} ${tileTone(!!overflowSelected, txType)}`}
        >
          {overflowSelected ? (
            <span className="text-xl leading-none">{overflowSelected.icon ?? '🏷️'}</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="text-gray-900 dark:text-gray-100">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
          )}
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate w-full text-center">
            {overflowSelected ? overflowSelected.name : 'More'}
          </span>
        </button>
      </div>
      {suggestedCategory && !moreOpen && (
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onChange(suggestedCategory.id)}
          className="mt-2 flex items-center gap-1.5 rounded-full border border-dashed border-hairline px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <span className="leading-none">{suggestedCategory.icon ?? '🏷️'}</span>
          <span>Last time this was <span className="font-medium">{suggestedCategory.name}</span> — use it</span>
        </button>
      )}
      {moreOpen && (
        <div className="mt-2.5">
          <CategorySelect
            categories={categories} filterType={txType} label=""
            value={categoryId} onChange={onChange} searchable autoOpen />
        </div>
      )}
    </div>
  )
}
