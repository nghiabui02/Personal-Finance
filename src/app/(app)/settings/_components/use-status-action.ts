import { useState } from 'react'
import { errorMessage } from '@/lib/utils/errors'
import type { Status } from './settings-section'

/**
 * A save button's lifecycle: saving while it runs, then a green or red line
 * saying how it went. The task returns the sentence to show on success; any
 * error it throws is shown instead.
 */
export function useStatusAction() {
  const [status, setStatus] = useState<Status | null>(null)
  const [saving, setSaving] = useState(false)

  async function run(task: () => Promise<string>) {
    setSaving(true)
    setStatus(null)
    try {
      setStatus({ type: 'success', text: await task() })
    } catch (err) {
      setStatus({ type: 'error', text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return { status, saving, run }
}
