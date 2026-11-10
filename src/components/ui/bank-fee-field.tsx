'use client'

import { AmountInput } from './amount-input'

/**
 * The optional bank fee under a spend: a quiet "add" link until it is wanted,
 * then an amount field named `fee` with a way to take it back out.
 *
 * The owner keeps `isOpen`, because whether the fee counts is the owner's
 * business — a removed fee must not be added to the total or submitted.
 */
export function BankFeeField({
  isOpen,
  onOpenChange,
  defaultValue,
  onValueChange,
  children,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  defaultValue: number
  onValueChange?: (fee: number) => void
  /** The line under the field saying what the fee does to the total. */
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-hairline pt-3">
      {!isOpen ? (
        <button type="button" onClick={() => onOpenChange(true)}
          className="text-xs text-gray-400 hover:text-brand transition-colors flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
          Add bank fee (for international transactions)
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Bank fee</p>
            <button type="button" onClick={() => onOpenChange(false)}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors">
              Remove
            </button>
          </div>
          <AmountInput label="" name="fee" defaultValue={defaultValue} onValueChange={onValueChange} autoFocus />
          <p className="text-xs text-gray-400 dark:text-gray-500">{children}</p>
        </div>
      )}
    </div>
  )
}
