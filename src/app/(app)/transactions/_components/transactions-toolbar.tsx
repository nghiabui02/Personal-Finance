'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ViewSelector, type ViewMode } from './period-navigator'
import type { NoteSearch } from './use-note-search'

const ICON_BUTTON_IDLE =
  'text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'

const SEARCH_PATH = 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
const CLOSE_PATH = 'M6 18 18 6M6 6l12 12'
const PLUS_PATH = 'M12 4.5v15m7.5-7.5h-15'
const FILTER_PATH =
  'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z'

function Icon({ path, size = 15, strokeWidth = 2, className }: {
  path: string; size?: number; strokeWidth?: number; className?: string
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function SearchInput({ search }: { search: NoteSearch }) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Mounted only while the box is open, so mounting is the moment to focus.
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="animate-search-expand flex-1 min-w-0">
      <div className="relative">
        <Icon path={SEARCH_PATH} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={search.value}
          onChange={e => search.setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') search.submit()
            if (e.key === 'Escape') search.clear()
          }}
          placeholder="Search by note… (Enter)"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
        />
      </div>
    </div>
  )
}

/** View switcher, note search, and the list's actions. The search box expands
 *  inline from its icon and pushes the view switcher out of the row. */
export function TransactionsToolbar({
  view,
  search,
  isSelecting,
  activeFilters,
  onToggleSelecting,
  onOpenFilters,
  onAdd,
}: {
  view: ViewMode
  search: NoteSearch
  isSelecting: boolean
  activeFilters: number
  onToggleSelecting: () => void
  onOpenFilters: () => void
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="grid shrink-0 overflow-hidden"
        style={{
          gridTemplateColumns: search.isOpen ? '0fr' : '1fr',
          opacity: search.isOpen ? 0 : 1,
          transition: 'grid-template-columns 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.18s ease',
        }}
      >
        <div className="min-w-0 overflow-hidden">
          <ViewSelector view={view} />
        </div>
      </div>

      {search.isOpen && <SearchInput search={search} />}

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Link href="/transactions/import" className="px-2 py-2 text-xs font-medium text-gray-500 hover:text-brand whitespace-nowrap">
          Import CSV
        </Link>
        <button
          onClick={onToggleSelecting}
          aria-pressed={isSelecting}
          className={`px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            isSelecting ? 'text-brand' : 'text-gray-500 hover:text-brand'
          }`}
        >
          {isSelecting ? 'Done' : 'Select'}
        </button>
        <button
          onClick={search.isOpen ? search.clear : search.open}
          className={`p-2 rounded-xl border transition-colors ${
            search.isOpen
              ? 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-800'
              : ICON_BUTTON_IDLE
          }`}
          aria-label={search.isOpen ? 'Close search' : 'Search'}
        >
          <Icon path={search.isOpen ? CLOSE_PATH : SEARCH_PATH} />
        </button>
        <button
          onClick={onOpenFilters}
          aria-label={activeFilters > 0 ? `Filters (${activeFilters} active)` : 'Filter transactions'}
          className={`relative p-2 rounded-xl border transition-colors ${
            activeFilters > 0 ? 'text-brand border-brand bg-brand-soft' : ICON_BUTTON_IDLE
          }`}
        >
          <Icon path={FILTER_PATH} />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-fill text-white text-[10px] font-semibold leading-4 text-center">
              {activeFilters}
            </span>
          )}
        </button>
        {/* Desktop only — on a phone the bottom nav's centre button already
            covers this, and it opens the full-page form instead of a dialog.
            The wrapper carries the visibility: Button sets its own
            `inline-flex`, which outranks a `hidden` passed via className. */}
        <div className="hidden md:block">
          <Button onClick={onAdd}>
            <Icon path={PLUS_PATH} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
