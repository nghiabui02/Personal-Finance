'use client'

import { useState } from 'react'
import { amountSuggestions, formatWithDots } from '@/components/ui/amount-input'

/**
 * Stops a click from moving focus out of whatever field the user was typing in.
 *
 * Without it the mousedown blurs the input and the browser scrolls the newly
 * focused button into view inside the modal's scrollport. The element under the
 * pointer shifts before mouseup, so no click is dispatched at all and the first
 * press appears to do nothing but unfocus.
 */
export const keepFocus = (e: React.MouseEvent) => e.preventDefault()

/** Big centered amount display, tinted by transaction type. */
export function CenteredAmountInput({
  name,
  defaultValue,
  txType,
  onValueChange,
  autoFocus,
}: {
  name: string
  defaultValue?: number
  txType: 'income' | 'expense'
  onValueChange?: (value: number) => void
  autoFocus?: boolean
}) {
  const [display, setDisplay] = useState(
    defaultValue ? formatWithDots(String(defaultValue)) : ''
  )
  const rawValue = display.replace(/\./g, '')
  const isExpense = txType === 'expense'

  function handleChange(next: string) {
    setDisplay(next)
    onValueChange?.(Number(next.replace(/\./g, '')) || 0)
  }

  // The field grows with its content, so long amounts have to shrink instead
  // of pushing the modal open. Digits are already capped by formatWithDots.
  const sizeClass =
    display.length > 13 ? 'text-2xl'
    : display.length > 10 ? 'text-3xl'
    : 'text-4xl'

  const suggestions = amountSuggestions(display)

  return (
    <div className="text-center">
      <input type="hidden" name={name} value={rawValue} />
      <div className={`inline-flex items-baseline gap-1.5 max-w-full ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => handleChange(formatWithDots(e.target.value))}
          placeholder="0"
          autoFocus={autoFocus}
          size={1}
          style={{ width: `${Math.max(display.length, 1)}ch`, maxWidth: '100%' }}
          className={`bg-transparent ${sizeClass} font-bold tabular-nums text-center outline-none placeholder:text-current caret-current min-w-0`}
        />
        <span className="text-xl font-semibold shrink-0">đ</span>
      </div>
      <div className={`mx-auto mt-2 h-0.5 w-36 rounded-full ${isExpense ? 'bg-rose-400' : 'bg-emerald-400'}`} />

      {/* Shortcuts to the same digits one, two and three zeros longer.
          onMouseDown keeps the caret in the field, so typing can carry on. */}
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={keepFocus}
              onClick={() => handleChange(s)}
              className="rounded-full border border-hairline px-2.5 py-1 text-xs tabular-nums text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
