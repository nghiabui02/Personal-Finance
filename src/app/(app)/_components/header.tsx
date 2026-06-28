'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useState } from 'react'

export default function Header({
  user,
  title,
  backHref,
}: {
  user: User
  title?: string
  backHref?: string
}) {
  const meta = user.user_metadata ?? {}
  const avatarUrl = meta.avatar_url as string | undefined
  const displayName = (meta.full_name as string) || user.email?.split('@')[0] || 'User'
  const initials = displayName[0]?.toUpperCase() ?? 'U'
  const [avatarErr, setAvatarErr] = useState(false)

  return (
    <header className="shrink-0 pt-safe bg-gray-50 md:bg-white md:border-b md:border-gray-200 dark:bg-gray-950 md:dark:bg-gray-900 md:dark:border-gray-800">
      <div className="h-14 flex items-center gap-3 px-4 md:px-6">

        {/* Mobile: back link for More sub-pages */}
        {backHref ? (
          <>
            <Link
              href={backHref}
              className="md:hidden flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400 -ml-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span className="text-base font-semibold">{title ?? 'Back'}</span>
            </Link>
            {/* Desktop: plain title */}
            <span className="hidden md:block text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
              {title ?? 'Finance'}
            </span>
          </>
        ) : (
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
            {title ?? 'Finance'}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {avatarUrl && !avatarErr ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0"
              onError={() => setAvatarErr(true)}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-200 flex items-center justify-center text-white dark:text-gray-900 text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 max-w-36 truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  )
}
