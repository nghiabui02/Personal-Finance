'use client'

import { authApi } from '@/lib/api/auth'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Header({
  user,
  onMenuToggle,
}: {
  user: User
    onMenuToggle?: () => void
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const meta = user.user_metadata ?? {}
  const avatarUrl = meta.avatar_url as string | undefined
  const displayName = (meta.full_name as string) || user.email || ''
  const initials = displayName[0]?.toUpperCase() ?? 'U'
  const [avatarErr, setAvatarErr] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await authApi.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="shrink-0 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 pt-safe">
      <div className="h-14 flex items-center gap-2 px-4 md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* App name — mobile only */}
      <span className="md:hidden text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
        Finance
      </span>

      {/* Spacer — desktop */}
      <div className="hidden md:block flex-1" />

      {/* Avatar + name/email */}
      <div className="hidden sm:flex items-center gap-2">
        {avatarUrl && !avatarErr ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0"
            onError={() => setAvatarErr(true)}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400 max-w-35 truncate">
          {displayName}
        </span>
      </div>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 whitespace-nowrap"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
      </div>
    </header>
  )
}
