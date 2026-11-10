'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { settingsApi } from '@/lib/api/settings'
import { removeStoredAvatars, uploadAvatar } from './avatar-storage'
import { Section, StatusLine } from './settings-section'
import { useStatusAction } from './use-status-action'

export function ProfileSection({
  userId,
  currentEmail,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: {
  userId: string
  currentEmail: string
  initialName: string
  initialPhone: string
  initialAvatarUrl: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const { status, saving, run } = useStatusAction()

  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl)

  // Sync from server data (e.g. after router.refresh()) — adjust state during render
  // instead of in an effect: https://react.dev/learn/you-might-not-need-an-effect
  const [prevInitialAvatarUrl, setPrevInitialAvatarUrl] = useState(initialAvatarUrl)
  if (initialAvatarUrl !== prevInitialAvatarUrl) {
    setPrevInitialAvatarUrl(initialAvatarUrl)
    if (!avatarFile) {
      setAvatarUrl(initialAvatarUrl)
      setAvatarPreview(initialAvatarUrl)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function saveProfile() {
    return run(async () => {
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(userId, avatarFile)
        setAvatarUrl(finalAvatarUrl)
        setAvatarFile(null)
      }
      await settingsApi.updateProfile({ full_name: name, phone, avatar_url: finalAvatarUrl })
      router.refresh()
      return 'Profile updated.'
    })
  }

  function removeAvatar() {
    return run(async () => {
      await removeStoredAvatars(userId)
      await settingsApi.updateProfile({ avatar_url: '' })
      setAvatarUrl('')
      setAvatarPreview('')
      setAvatarFile(null)
      router.refresh()
      return 'Photo removed.'
    })
  }

  return (
    <Section title="Profile">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative shrink-0">
          <Avatar src={avatarPreview} name={name || currentEmail} size="xl" tone="brand" alt="Avatar" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 border border-hairline rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
            </svg>
          </button>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-brand hover:underline font-medium">
              Change photo
            </button>
            {avatarPreview && (
              <button type="button" onClick={removeAvatar} disabled={saving} className="text-sm text-rose-500 hover:underline disabled:opacity-50">
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG · max 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <div className="space-y-4">
        <Input label="Full name" name="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" clearable={false} />
        <Input label="Phone (optional)" name="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84 xxx xxx xxx" clearable={false} />
      </div>

      <StatusLine status={status} />
      <Button onClick={saveProfile} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </Section>
  )
}
