'use client'
import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api/settings'
import { Section, StatusLine } from './settings-section'
import { useStatusAction } from './use-status-action'

export function PasswordSection() {
  const t = useTranslations('settings')
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
    <Section title={t('password')}>
      <div className="space-y-4">
        <Input label={t('currentPassword')} name="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder={t('yourCurrentPassword')} clearable={false} />
        <Input label={t('newPassword')} name="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('atLeast6Characters')} clearable={false} />
        <Input label={t('confirmNewPassword')} name="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('reEnterNewPassword')} clearable={false} />
      </div>
      <StatusLine status={status} />
      <Button onClick={updatePassword} disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="mt-4">
        {saving ? t('updating') : t('updatePassword')}
      </Button>
    </Section>
  )
}
