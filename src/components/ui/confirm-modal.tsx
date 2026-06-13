'use client'

import { Button } from './button'
import { Modal } from './modal'

interface ConfirmModalProps {
  title: string
  description?: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Delete',
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4">
        {/* Warning icon */}
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-red-600 dark:text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>

        <div className="flex gap-2 w-full pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
