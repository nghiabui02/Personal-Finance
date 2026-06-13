'use client'

import { signOut } from '@/app/actions/auth'
import { User } from '@supabase/supabase-js'
import ThemeToggle from './theme-toggle'

export default function Header({ user }: { user: User }) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-end gap-2 px-6 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <ThemeToggle />
      <span className="text-sm text-gray-400 dark:text-gray-500 select-none">·</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Sign out
        </button>
      </form>
    </header>
  )
}
