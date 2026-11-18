import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import SettingsClient from './_components/settings-client'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('settings') }
}
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { user } = await requireUser()

  const meta = user.user_metadata ?? {}

  return (
    <SettingsClient
      userId={user.id}
      currentEmail={user.email ?? ''}
      initialName={meta.full_name ?? ''}
      initialPhone={meta.phone ?? ''}
      initialAvatarUrl={meta.avatar_url ?? ''}
    />
  )
}
