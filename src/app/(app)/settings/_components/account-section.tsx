'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { Section } from './settings-section'

export function AccountSection() {
  const router = useRouter()
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
