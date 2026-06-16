'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

interface SettingsClientProps {
  userId: string
  currentEmail: string
  initialName: string
  initialPhone: string
  initialAvatarUrl: string
}

const BUCKET = 'Avatar'

export default function SettingsClient({
  userId,
  currentEmail,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: SettingsClientProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl)
  const [imgError, setImgError] = useState(false)

  // Sync state when server refreshes with new props
  useEffect(() => {
    if (initialAvatarUrl !== avatarUrl && !avatarFile) {
      setAvatarUrl(initialAvatarUrl)
      setAvatarPreview(initialAvatarUrl)
      setImgError(false)
    }
  }, [initialAvatarUrl])
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Email state
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setImgError(false)
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      let finalAvatarUrl = avatarUrl

      // Upload avatar if new file selected
      if (avatarFile) {
        const supabase = createClient()
        // Delete old avatar files first (handles extension change e.g. jpg → png)
        const { data: existing } = await supabase.storage.from(BUCKET).list(userId)
        if (existing?.length) {
          await supabase.storage.from(BUCKET).remove(existing.map(f => `${userId}/${f.name}`))
        }

        const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${userId}/avatar.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, avatarFile)

        if (uploadError) throw new Error(uploadError.message)

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        finalAvatarUrl = `${data.publicUrl}?t=${Date.now()}` // bust cache
        setAvatarUrl(finalAvatarUrl)
        setAvatarFile(null)
      }

      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone, avatar_url: finalAvatarUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setProfileMsg({ type: 'success', text: 'Profile updated.' })
      router.refresh()
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleRemoveAvatar() {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase.storage.from(BUCKET).list(userId)
      if (existing?.length) {
        await supabase.storage.from(BUCKET).remove(existing.map(f => `${userId}/${f.name}`))
      }
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: '' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setAvatarUrl('')
      setAvatarPreview('')
      setAvatarFile(null)
      setProfileMsg({ type: 'success', text: 'Photo removed.' })
      router.refresh()
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleUpdateEmail() {
    setSavingEmail(true)
    setEmailMsg(null)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEmailMsg({ type: 'success', text: json.message })
      setNewEmail('')
    } catch (err) {
      setEmailMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setSavingEmail(false)
    }
  }

  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const initials = (name || currentEmail)[0]?.toUpperCase() ?? 'U'

  const themeOptions = [
    { value: 'light',  label: 'Light',  icon: '☀️' },
    { value: 'dark',   label: 'Dark',   icon: '🌙' },
    { value: 'system', label: 'Device', icon: '💻' },
  ] as const

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* ── Profile ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {avatarPreview && !imgError ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold ring-2 ring-gray-200 dark:ring-gray-700">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Change photo
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={savingProfile}
                  className="text-sm text-red-500 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG · max 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="space-y-4">
          <Input
            label="Full name"
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            clearable={false}
          />
          <Input
            label="Phone (optional)"
            name="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+84 xxx xxx xxx"
            clearable={false}
          />
        </div>

        {profileMsg && (
          <p className={`mt-3 text-sm ${profileMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {profileMsg.text}
          </p>
        )}

        <Button onClick={handleSaveProfile} disabled={savingProfile} className="mt-4">
          {savingProfile ? 'Saving...' : 'Save changes'}
        </Button>
      </div>

      {/* ── Email ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Email</h2>
        <p className="text-xs text-gray-400 mb-5">Current: <span className="text-gray-600 dark:text-gray-300">{currentEmail}</span></p>

        <div className="space-y-4">
          <Input
            label="New email"
            name="new-email"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            clearable={false}
          />
        </div>

        {emailMsg && (
          <p className={`mt-3 text-sm ${emailMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {emailMsg.text}
          </p>
        )}

        <Button onClick={handleUpdateEmail} disabled={savingEmail || !newEmail.trim()} className="mt-4">
          {savingEmail ? 'Sending...' : 'Update email'}
        </Button>
        <p className="mt-2 text-xs text-gray-400">A confirmation link will be sent to the new email.</p>
      </div>

      {/* ── Appearance ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-5">Appearance</h2>
        {mounted && (
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className={`text-xs font-medium ${
                  theme === opt.value
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {opt.label}
                </span>
                {theme === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
