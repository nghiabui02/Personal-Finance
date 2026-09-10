'use client'

import { useState } from 'react'

export function formatWithDots(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

interface AmountInputProps {
  label: string
  name: string
  defaultValue?: number
  required?: boolean
  placeholder?: string
  // Fires the numeric value on every keystroke — for live previews
  // (e.g. "remaining after this payment") without switching the field
  // to a fully controlled input.
  onValueChange?: (value: number) => void
  /** Focus on mount — for fields revealed by a toggle, so the user can type
   *  straight after clicking (e.g. "Add bank fee"). */
  autoFocus?: boolean
}

export function AmountInput({ label, name, defaultValue, required, placeholder = '0', onValueChange, autoFocus }: AmountInputProps) {
  const [display, setDisplay] = useState(
    defaultValue ? formatWithDots(String(defaultValue)) : ''
  )

  const rawValue = display.replace(/\./g, '')

  function handleChange(next: string) {
    setDisplay(next)
    onValueChange?.(Number(next.replace(/\./g, '')) || 0)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={rawValue} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => handleChange(formatWithDots(e.target.value))}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 pr-14 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {display && (
            <button
              type="button"
              onClick={() => handleChange('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="text-sm text-gray-400 pointer-events-none">₫</span>
        </div>
      </div>
    </div>
  )
}
