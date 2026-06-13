'use client'

import { useState } from 'react'

function formatWithDots(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  // Insert dots every 3 digits from the right: 1000000 → 1.000.000
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

interface AmountInputProps {
  label: string
  name: string
  defaultValue?: number
  required?: boolean
  placeholder?: string
}

export function AmountInput({ label, name, defaultValue, required, placeholder = '0' }: AmountInputProps) {
  const [display, setDisplay] = useState(
    defaultValue ? formatWithDots(String(defaultValue)) : ''
  )

  const rawValue = display.replace(/\./g, '')

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {/* Hidden input carries the raw numeric value for form.elements access */}
      <input type="hidden" name={name} value={rawValue} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => setDisplay(formatWithDots(e.target.value))}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
          ₫
        </span>
      </div>
    </div>
  )
}
