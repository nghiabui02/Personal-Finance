'use client'

import { useEffect, useRef, useState } from 'react'

export type SelectOption = {
  value: string
  label: string | null
  icon?: string | null
  color?: string | null
}

interface CustomSelectProps {
  label: string | null
  name: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CustomSelect({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors outline-none ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20'
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

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.map(opt => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {opt.icon ? (
                      <span className="text-base w-5 text-center shrink-0">{opt.icon}</span>
                    ) : opt.color ? (
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="shrink-0 text-blue-600 dark:text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
