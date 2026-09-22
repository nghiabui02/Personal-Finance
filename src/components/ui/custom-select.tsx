'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPanel, useOutsideClose } from './use-anchored-panel'

type SelectOption = {
  value: string
  label: string | null
  icon?: string | null
  color?: string | null
}

/** Search box + ten rows, the most the list scrolls to. */
const PANEL_HEIGHT = 260

interface CustomSelectProps {
  label: string | null
  name: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  /** Open the list as soon as the field appears — for a field that is itself
   *  revealed by a click, so reaching an option does not cost a second one. */
  autoOpen?: boolean
}

export function CustomSelect({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  autoOpen = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find(o => o.value === value)

  const { triggerRef, panelRef, pos, reposition } = useAnchoredPanel<HTMLButtonElement>(
    open, { height: PANEL_HEIGHT },
  )
  const close = useCallback(() => { setOpen(false); setQuery('') }, [])
  useOutsideClose(ref, panelRef, close)

  // Opening happens as the container mounts rather than in an effect, so the
  // trigger is already measurable and the list is up on the render that reveals
  // the field — no second click to get at the options.
  const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node
    if (!node || !autoOpen) return
    reposition()
    setOpen(true)
  }, [autoOpen, reposition])

  // Auto-focus the search input on mount — but not on touch devices, where
  // it pops the on-screen keyboard over the very list you want to scroll.
  const searchCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (!node) return
    inputRef.current = node
    if (window.matchMedia('(pointer: fine)').matches) node.focus()
  }, [])

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label?.toLowerCase().includes(query.toLowerCase()))
    : options

  // Closing the dropdown always clears the search query — every close path
  // (select, escape, outside click, trigger toggle) goes through here.
  function toggleOpen() {
    if (open) { close(); return }
    reposition()
    setOpen(true)
  }

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) handleSelect(filtered[0].value)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  if (searchable) {
    return (
      <div ref={containerCallbackRef} className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input type="hidden" name={name} value={value} />

        {/* Trigger button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className={`w-full h-[42px] flex items-center justify-between gap-2 rounded-lg border px-3 text-sm text-left transition-colors outline-none ${
            open
              ? 'border-brand'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          } bg-white dark:bg-gray-800`}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                {selected.icon && <span className="text-base shrink-0">{selected.icon}</span>}
                {selected.color && !selected.icon && (
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
                )}
                <span className="text-gray-900 dark:text-gray-100 truncate">{selected.label}</span>
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown with search */}
        {open && pos && createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden animate-dropdown-in"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
          >
            {/* Search box */}
            <div className="px-2 pt-2 pb-1">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-400 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  ref={searchCallbackRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                />
                {query && (
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-gray-400">No results</li>
              ) : filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isHighlighted = i === 0
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 h-9 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-soft text-brand'
                          : isHighlighted
                            ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {opt.icon ? (
                        <span className="text-base leading-none w-5 text-center shrink-0">{opt.icon}</span>
                      ) : opt.color ? (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{opt.label}</span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="shrink-0 text-brand">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  // Non-searchable: original button trigger
  return (
    <div ref={containerCallbackRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input type="hidden" name={name} value={value} />

      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full h-[42px] flex items-center justify-between gap-2 rounded-lg border px-3 text-sm text-left transition-colors outline-none ${
          open
            ? 'border-brand'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } bg-white dark:bg-gray-800`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              {selected.icon && <span className="text-base shrink-0">{selected.icon}</span>}
              {selected.color && !selected.icon && (
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
              )}
              <span className="text-gray-900 dark:text-gray-100 truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden animate-dropdown-in"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
        >
          <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {options.map(opt => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 h-9 text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-soft text-brand'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {opt.icon ? (
                      <span className="text-base leading-none w-5 text-center shrink-0">{opt.icon}</span>
                    ) : opt.color ? (
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="shrink-0 text-brand">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
