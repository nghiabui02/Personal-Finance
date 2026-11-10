import { useState } from 'react'
import { errorMessage } from '@/lib/utils/errors'

/**
 * The pending flag and the error line the four auth forms share.
 *
 * Each page keeps its own request and its own redirect; only the bookkeeping
 * around it is here. A failure shows the message and re-enables the form. A
 * success leaves the form disabled — by then the page is navigating away, and
 * a button that came back to life mid-redirect invites a second submit. A page
 * that stays put on success (it swaps in a "check your email" panel) asks for
 * `reenableOnSuccess`.
 */
export function useAuthForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function submit(
    task: () => Promise<void>,
    { fallback, reenableOnSuccess = false }: { fallback?: string; reenableOnSuccess?: boolean } = {},
  ) {
    setError(null)
    setIsPending(true)
    try {
      await task()
      if (reenableOnSuccess) setIsPending(false)
    } catch (err) {
      setError(errorMessage(err, fallback))
      setIsPending(false)
    }
  }

  return { error, setError, isPending, submit }
}
