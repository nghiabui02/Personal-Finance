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
