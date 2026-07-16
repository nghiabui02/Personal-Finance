'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/auth'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useRef, useState, useSyncExternalStore } from 'react'

interface SettingsClientProps {
  userId: string
  currentEmail: string
  initialName: string
  initialPhone: string
  initialAvatarUrl: string
}

const BUCKET = 'Avatar'

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <circle cx="12" cy="12" r="4"/>
    <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <path strokeLinecap="round" d="M8 21h8M12 17v4"/>
  </svg>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">{title}</p>
    {children}
  </div>
)

export default function SettingsClient({
  userId,
  currentEmail,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: SettingsClientProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl)
  const [imgError, setImgError] = useState(false)

  // Sync from server data (e.g. after router.refresh()) — adjust state during render
  // instead of in an effect: https://react.dev/learn/you-might-not-need-an-effect
  const [prevInitialAvatarUrl, setPrevInitialAvatarUrl] = useState(initialAvatarUrl)
  if (initialAvatarUrl !== prevInitialAvatarUrl) {
    setPrevInitialAvatarUrl(initialAvatarUrl)
    if (!avatarFile) {
      setAvatarUrl(initialAvatarUrl)
      setAvatarPreview(initialAvatarUrl)
      setImgError(false)
    }
  }

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

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
      if (avatarFile) {
        const supabase = createClient()
        const { data: existing } = await supabase.storage.from(BUCKET).list(userId)
        if (existing?.length) {
          await supabase.storage.from(BUCKET).remove(existing.map(f => `${userId}/${f.name}`))
        }
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true })
        if (uploadError) throw new Error(uploadError.message)
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        finalAvatarUrl = `${data.publicUrl}?t=${Date.now()}`
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

  async function handleUpdatePassword() {
    setSavingPassword(true)
    setPasswordMsg(null)
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password: newPassword, confirmPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPasswordMsg({ type: 'success', text: json.message })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setSavingPassword(false)
    }
  }

  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const initials = (name || currentEmail)[0]?.toUpperCase() ?? 'U'

  const themeOptions = [
    { value: 'light',  label: 'Light',  Icon: SunIcon  },
    { value: 'dark',   label: 'Dark',   Icon: MoonIcon },
    { value: 'system', label: 'Device', Icon: MonitorIcon },
  ] as const

  const msgClass = (type: 'success' | 'error') =>
    type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {avatarPreview && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny remote avatar, host varies per auth provider
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-semibold ring-2 ring-gray-100 dark:ring-gray-800">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-indigo-500 hover:underline font-medium">
                Change photo
              </button>
              {avatarPreview && (
                <button type="button" onClick={handleRemoveAvatar} disabled={savingProfile} className="text-sm text-rose-500 hover:underline disabled:opacity-50">
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

        {profileMsg && <p className={`mt-3 text-sm ${msgClass(profileMsg.type)}`}>{profileMsg.text}</p>}
        <Button onClick={handleSaveProfile} disabled={savingProfile} className="mt-4">
          {savingProfile ? 'Saving...' : 'Save changes'}
        </Button>
      </Section>

      {/* Email */}
      <Section title="Email">
        <p className="text-xs text-gray-400 -mt-3 mb-4">
          Current: <span className="text-gray-600 dark:text-gray-300">{currentEmail}</span>
        </p>
        <Input label="New email" name="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" clearable={false} />
        {emailMsg && <p className={`mt-3 text-sm ${msgClass(emailMsg.type)}`}>{emailMsg.text}</p>}
        <Button onClick={handleUpdateEmail} disabled={savingEmail || !newEmail.trim()} className="mt-4">
          {savingEmail ? 'Sending...' : 'Update email'}
        </Button>
        <p className="mt-2 text-xs text-gray-400">A confirmation link will be sent to the new email.</p>
      </Section>
      </div>

      <div className="space-y-4">
      {/* Password */}
      <Section title="Password">
        <div className="space-y-4">
          <Input label="Current password" name="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" clearable={false} />
          <Input label="New password" name="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" clearable={false} />
          <Input label="Confirm new password" name="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" clearable={false} />
        </div>
        {passwordMsg && <p className={`mt-3 text-sm ${msgClass(passwordMsg.type)}`}>{passwordMsg.text}</p>}
        <Button onClick={handleUpdatePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="mt-4">
          {savingPassword ? 'Updating...' : 'Update password'}
        </Button>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        {mounted && (
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, Icon }) => {
              const isActive = theme === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <Icon />
                  <span className="text-xs font-medium">{label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                </button>
              )
            })}
          </div>
        )}
      </Section>

      {/* Sign out */}
      <SignOutSection router={router} />
      </div>
    </div>
  )
}

function SignOutSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    await authApi.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Section title="Account">
      <button
        onClick={handleSignOut}
        disabled={pending}
        className="text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors disabled:opacity-50"
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </Section>
  )
}
