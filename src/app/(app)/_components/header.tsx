'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { NotificationBell } from './notification-bell'
import { Avatar } from '@/components/ui/avatar'

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

  return (
    <header className="shrink-0 pt-safe w-full bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm md:border-b md:border-gray-200 md:dark:border-gray-800">
      {/* md:pl offset = sidebar width (w-60) + content padding, since the fixed sidebar overlays the header */}
      <div className="h-14 md:h-16 flex items-center gap-3 px-4 md:pl-[calc(15rem+1.5rem)] md:pr-6">

        {/* Mobile: back link for More sub-pages */}
        {backHref ? (
          <>
            <Link
              href={backHref}
              className="md:hidden flex items-center gap-0.5 text-brand -ml-1 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <span className="text-base font-semibold">{title ?? 'Back'}</span>
            </Link>
            {/* Desktop: plain title */}
            <span className="hidden md:block text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 flex-1">
              {title ?? 'Finance'}
            </span>
          </>
        ) : (
          <span className="text-base md:text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 flex-1">
            {title ?? 'Finance'}
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
        <NotificationBell />
        {/* Mobile only — on desktop the user block lives at the bottom of the sidebar.
            It is also the way into Categories and Settings now that the bottom
            nav spends its slots on the four daily screens. */}
        <Link href="/more" aria-label="Account" className="flex md:hidden items-center gap-2 rounded-full">
          <Avatar src={avatarUrl} name={displayName} size="sm" />
          <span className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 max-w-36 truncate">
            {displayName}
          </span>
        </Link>
        </div>
      </div>
    </header>
  )
}
