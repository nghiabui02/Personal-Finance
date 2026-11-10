'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api/settings'
import { Section, StatusLine } from './settings-section'
import { useStatusAction } from './use-status-action'

export function PasswordSection() {
  const { status, saving, run } = useStatusAction()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function updatePassword() {
    return run(async () => {
      const { message } = await settingsApi.updatePassword({ currentPassword, password: newPassword, confirmPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      return message
    })
  }

  return (
    <Section title="Password">
      <div className="space-y-4">
        <Input label="Current password" name="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" clearable={false} />
        <Input label="New password" name="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" clearable={false} />
        <Input label="Confirm new password" name="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" clearable={false} />
      </div>
      <StatusLine status={status} />
      <Button onClick={updatePassword} disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="mt-4">
        {saving ? 'Updating...' : 'Update password'}
      </Button>
    </Section>
  )
}
