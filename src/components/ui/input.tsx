'use client'

import { useState } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  clearable?: boolean  // defaults to true for text inputs
}

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
)

// Types where a clear button doesn't make sense
const NO_CLEAR_TYPES = ['password', 'number', 'date', 'time', 'datetime-local', 'file', 'checkbox', 'radio']

export function Input({ label, error, id, clearable, className = '', defaultValue, onChange, type = 'text', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const [value, setValue] = useState(String(defaultValue ?? ''))

  // Show clear button by default for text-like inputs, unless explicitly disabled
  const showClear = clearable !== false && !NO_CLEAR_TYPES.includes(type)

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={e => {
            setValue(e.target.value)
            onChange?.(e)
          }}
          className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${showClear && value ? 'pr-8' : ''} ${className}`}
          {...props}
        />
        {showClear && value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ClearIcon />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
