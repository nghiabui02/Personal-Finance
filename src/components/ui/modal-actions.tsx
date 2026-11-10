import { Button, type ButtonVariant } from './button'

/**
 * The Cancel / Save pair at the foot of a form.
 *
 * The submit button is off while a request is running, and also while the
 * caller says the form cannot be submitted yet (`disabled`) — so callers never
 * repeat the pending check.
 */
export function ModalActions({
  isPending,
  disabled = false,
  submitLabel,
  pendingLabel = 'Saving...',
  submitVariant = 'primary',
  onCancel,
}: {
  isPending: boolean
  disabled?: boolean
  submitLabel: string
  pendingLabel?: string
  submitVariant?: ButtonVariant
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button type="button" variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant={submitVariant} disabled={isPending || disabled} fullWidth>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </div>
  )
}
