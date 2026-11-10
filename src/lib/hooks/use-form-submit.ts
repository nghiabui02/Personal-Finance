import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { errorMessage } from '@/lib/utils/errors'

/**
 * Submitting a form that lives in a dialog or a page: run the request, reload
 * the server data, then leave. A failure stays on the form and shows its
 * message instead.
 *
 * Only for forms that show their error inline. A screen that reports through a
 * toast, or does more than reload and close on success, keeps its own handler.
 *
 * @param onDone Called after the data has been reloaded — closes the dialog or
 *   leaves the page.
 */
export function useFormSubmit(onDone: () => void) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  /** Clears any earlier error, then runs `task` in a transition. */
  function submit(task: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await task()
        router.refresh()
        onDone()
      } catch (err) {
        setError(errorMessage(err))
      }
    })
  }

  // `setError` is exposed for the checks a form makes before it sends anything.
  return { error, setError, isPending, submit }
}
