import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './_components/settings-client'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meta = user.user_metadata ?? {}

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage your account</p>
      </div>
      <SettingsClient
        userId={user.id}
        currentEmail={user.email ?? ''}
        initialName={meta.full_name ?? ''}
        initialPhone={meta.phone ?? ''}
        initialAvatarUrl={meta.avatar_url ?? ''}
      />
    </div>
  )
}
