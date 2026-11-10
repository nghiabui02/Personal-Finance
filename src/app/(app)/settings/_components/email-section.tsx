'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api/settings'
import { Section, StatusLine } from './settings-section'
import { useStatusAction } from './use-status-action'

export function EmailSection({ currentEmail }: { currentEmail: string }) {
  const { status, saving, run } = useStatusAction()
  const [newEmail, setNewEmail] = useState('')

  function updateEmail() {
    return run(async () => {
      const { message } = await settingsApi.updateEmail(newEmail)
      setNewEmail('')
      return message
    })
  }

  return (
    <Section title="Email">
      <p className="text-xs text-gray-400 -mt-3 mb-4">
        Current: <span className="text-gray-600 dark:text-gray-300">{currentEmail}</span>
      </p>
      <Input label="New email" name="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" clearable={false} />
      <StatusLine status={status} />
      <Button onClick={updateEmail} disabled={saving || !newEmail.trim()} className="mt-4">
        {saving ? 'Sending...' : 'Update email'}
      </Button>
      <p className="mt-2 text-xs text-gray-400">A confirmation link will be sent to the new email.</p>
    </Section>
  )
}
