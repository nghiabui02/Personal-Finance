import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toastError } from '@/components/ui/toast'

/**
 * The delete-with-a-confirm-step flow of a list screen: a row asks to be
 * deleted, a dialog confirms, the request runs, the list reloads.
 *
 * A failure is shown as a toast and the dialog closes either way, so the
 * screen is never left holding a half-confirmed row.
 *
 * @param remove Deletes one row by id.
 * @param failureMessage Shown when `remove` fails and gives no message of its own.
 */
export function useDeleteConfirmation(remove: (id: string) => Promise<unknown>, failureMessage: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function confirm() {
    if (!confirmId) return
    startTransition(async () => {
      try {
        await remove(confirmId)
        router.refresh()
      } catch (err) {
        toastError(err, failureMessage)
      } finally {
        setConfirmId(null)
      }
    })
  }

  return {
    /** The row the dialog is asking about; null while it is closed. */
    confirmId,
    /** True while the delete request runs. */
    isPending,
    ask: setConfirmId,
    cancel: () => setConfirmId(null),
    confirm,
  }
}
